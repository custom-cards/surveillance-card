import {
  css,
  html,
  LitElement,
} from "https://unpkg.com/lit-element@2.3.1/lit-element.js?module";

class SurveillanceCard extends LitElement {
  render() {
    if (!this.cameras) {
      return html`<div class="loading">Loading Cameras...</div>`;
    }

    const screenWidth = (window.innerWidth > 0) ? window.innerWidth : screen.width;
    let screenSizeClass = "";

    if (screenWidth<520) screenSizeClass = "tinyScreen";
    else if(screenWidth<1000) screenSizeClass = "smallScreen";

    // Capture functionality not available in HA iOS and Android apps
    const showToolbarClass = ( !this.isMobileApp && this.showCaptureButtons ) ? "" : "hidden";

    return html`
      <div class="container">
        <div class="thumbs">
          ${this.cameras.filter((c) => c.access_token).map((camera) => {
              let thumbClass = camera.has_motion ? "thumb motion" : "thumb";
              let toolbarClass = this.showCaptureButtons ? "" : "hidden";

              return html`
                <div class="${thumbClass}" @click="${() => this._updateSelectedCamera(camera)}">
                  <img src="${camera.url}" alt="${camera.name}" />
                </div>
                <div class="toolbar ${showToolbarClass} ${screenSizeClass}" >
                  <a target="_blank" class="snapshot" href="${camera.url}" download="${camera.name.replace(' ','_')+"_"+ new Date().toISOString()+".jpg"}"></a>
                  <a class="record" @click="${(clickEvent) => this._recordSequence(clickEvent)}"></a>
                </div>
              `;
            })}
        </div>
        <div class="mainImage">
          <img src="${this.selectedCamera.stream_url}" alt="${this.selectedCamera.name}" />
        </div>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: { type: Object },
      cameras: { type: Array },
      selectedCamera: { type: Object },
      focusOnMotion: { type: Boolean },
      thumbInterval: { type: Number },
      updateInterval: { type: Number },
      recordingDuration: { type: Number },
      showCaptureButtons: { type: Boolean }
    };
  }

  get hass() {
    return this._hass;
  }

  set hass(hass) {
    this._hass = hass;
    this.updateCameras();
  }

  connectedCallback() {
    super.connectedCallback();
    this.thumbUpdater = setInterval(() => this.updateCameras(), this.thumbInterval);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.thumbUpdater);
  }

  setConfig(config) {
    if (!config.cameras) {
      throw new Error("You need to define cameras");
    }

    this.focusOnMotion = config.focus_motion !== false;
    this.thumbInterval = (config.thumb_interval || 10.0) * 1000;
    this.updateInterval = config.update_interval || 1.0;
    this.recordingDuration = config.recording_duration || 10.0;
    this.showCaptureButtons = config.show_capture_buttons !== false;

    // There must be better way to tell if HA front end running from app or browser
    // Confirmed working on iOS, should be verified on Android app
    this.isMobileApp = navigator.userAgent.indexOf("HomeAssistant") > -1;

    const now = Date.now();
    this.cameras = config.cameras.map((camera) => {
      const entity = this.hass && hass.states[camera.entity];
      const attributes = entity && entity.attributes;
      return {
        access_token: attributes && attributes.access_token,
        entity: camera.entity,
        motion_entity: camera.motion_entity,
        name: attributes && attributes.friendly_name,
        has_motion: this.hass && this.hass.states[camera.motion_entity].state === "on",
        last_motion: now,
        last_update: now,
        stream_url: "",
        url: attributes && attributes.entity_picture,
      };
    });
    this.updateCameras = this.throttle(() => this._updateCameras(), this.thumbInterval);
    this._updateSelectedCamera();
  }

  _updateCameras() {
    const now = Date.now();
    const { states } = this.hass;
    const activatedCameras = [];

    for (const camera of this.cameras) {
      const hadMotion = camera.has_motion === true;
      const { motion_entity } = camera;
      camera.has_motion = motion_entity in states && states[motion_entity].state === "on";
      if (camera.has_motion) {
        camera.last_motion = now;
      }

      const motionActivated = !hadMotion && camera.has_motion;
      if (motionActivated) {
        activatedCameras.push(camera);
      }

      // update if there was just motion occurred or the thumb interval was reached.
      if (motionActivated || now - camera.last_update > this.thumbInterval) {
        camera.last_update = now;
      }

      const attributes = camera.entity in states ? states[camera.entity].attributes || {} : {};
      camera.access_token = attributes.access_token;
      camera.name = attributes.friendly_name;
      camera.url = `${attributes.entity_picture}&last_update=${camera.last_update}`;
      camera.stream_url = `/api/camera_proxy_stream/${camera.entity}?token=${camera.access_token}&interval=${this.updateInterval}`;
    }

    if (this.focusOnMotion && activatedCameras.length > 0) {
      this._updateSelectedCamera(activatedCameras.find((c) => c === this.selectedCamera) || activatedCameras[0]);
    }

    this.cameras.sort(this._cameraSortComparer);
    this.cameras = [...this.cameras];
  }

  _updateSelectedCamera(camera) {
    if (!camera || !camera.access_token) {
      let availableCameras = this.cameras.filter((c) => c.access_token && c.has_motion);
      availableCameras.sort(this._cameraSortComparer);
      camera = availableCameras[0] || this.cameras[0];
    }

    if (this.selectedCamera !== camera) {
      this.selectedCamera = camera;
    }
  }

  _cameraSortComparer(cameraA, cameraB) {
    // prefer has_motion
    if (cameraA.has_motion < cameraB.has_motion) {
      return 1;
    }

    if (cameraA.has_motion === cameraB.has_motion) {
      // prefer last_update
      if (cameraA.last_update < cameraB.last_update) {
        return 0;
      }

      return cameraA.last_update === cameraB.last_update ? 0 : -1;
    }
  }

  _recordSequence(clickEvent){
    let currentThumbSnapshotBtn = clickEvent.srcElement.previousElementSibling;
    let cameraThumbContainer = clickEvent.srcElement.parentElement.previousElementSibling;

    let totalSnapshots = this.recordingDuration/(this.thumbInterval/1000);
    let snapshotCount = 1;

    currentThumbSnapshotBtn.click();
    cameraThumbContainer.classList.add("recording");

    let snapshotInterval = setInterval(function(){
      currentThumbSnapshotBtn.click();
      snapshotCount++;

      if (snapshotCount>totalSnapshots) {
        cameraThumbContainer.classList.remove("recording");
        clearInterval(snapshotInterval);
      }
    
    }, this.thumbInterval);
  }

  static get styles() {
    return css`
      .container {
        height: 100%;
        width: 100%;
        display: flex;
        align-items: stretch;
        position: absolute;
      }

      .thumbs {
        flex: 1;
        overflow-y: auto;
        position: relative;
        text-align:center;
      }

      .thumb > img {
        width: 100%;
        height: auto;
        min-height: 22px;
        border: 1px solid var(--primary-color);
        min-height:91px;
      }

      .thumb {
        width: calc(100% - 9px);
        padding: 2px 4px;
        position: relative;
      }

      .thumb.motion > img {
        border-color: var(--accent-color);
      }

      img {
        display: block;
      }

      .mainImage {
        flex: 3;
        height: 100%;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .mainImage > img {
        display: inline-block;
        max-width: 100%;
        max-height: 100%;
      }

      .loading {
        text-align: center;
        font-size: 1.2rem;
        margin-top: 3rem;
      }

      .toolbar{
        overflow: hidden;
        position: relative;
        left: 50%;
        margin-left: -65px;
        width: 132px;
        height: 62px;
        bottom: 78px;
        margin-bottom: -62px;
      }

      .toolbar.smallScreen{
        bottom: 30px;
        width: auto;
        left: auto;
        margin: 0px 0px -30px;
      }

      .toolbar.tinyScreen{
        bottom: 0;
        height: 150px;
        width: auto;
        margin: 6px 0;
        left:0;
      }

      .snapshot{
        width: 60px;
        height: 60px;
        background-image: url(/local/surveillance-card/snapshot.svg);
        display: inline-block;
        background-repeat: no-repeat;
        background-size: 60% 60%;
        background-position: 50% 50%;
        opacity: 0.8;
        background-color: rgb(51, 51, 51);
        border-radius:60px;
        cursor:pointer;
        border: 1px solid var(--primary-color);
        margin-right:4px;
      }
      
      .record{
        width: 60px;
        height: 60px;
        background-image: url(/local/surveillance-card/record.svg);
        display: inline-block;
        background-repeat: no-repeat;
        background-size: 60% 60%;
        background-position: 50% 50%;
        opacity: 0.8;
        background-color: rgb(51, 51, 51);
        border-radius:60px;
        cursor:pointer;
        border: 1px solid var(--primary-color);
      }

      .smallScreen .record, .smallScreen .snapshot{
        width:50px;
        height:50px;
        opacity: 1;
      }

      .recording img{
        border: 3px solid var(--primary-color);
      }

      .hidden{
        display:none;
      }

    `;
  }

  throttle(callback, delay) {
    let isThrottled = false,
      args,
      context;

    function wrapper() {
      if (isThrottled) {
        args = arguments;
        context = this;
        return;
      }

      isThrottled = true;
      callback.apply(this, arguments);

      setTimeout(() => {
        isThrottled = false;
        if (args) {
          wrapper.apply(context, args);
          args = context = null;
        }
      }, delay);
    }

    return wrapper;
  }
}
customElements.define("surveillance-card", SurveillanceCard);
