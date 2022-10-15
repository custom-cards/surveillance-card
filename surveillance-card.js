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
      <div class="container thumbs-${this.thumbPosition}">
        <div class="thumbs">
          ${this.cameras.filter((c) => c.access_token).map((camera) => {
              let thumbClass = camera.has_motion ? "thumb motion" : "thumb";

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
          ${this.renderMain()}
        </div>
      </div>
    `;
  }

  renderMain() {
    if (this.liveStream) {
      const cameraObj = this.hass.states[this.selectedCamera.entity];
      if (!cameraObj) {
        return html``;
      }

      return html`
        <ha-camera-stream
          .hass=${this.hass}
          .stateObj="${cameraObj}"
        ></ha-camera-stream>
      `;
    }

    return html`<img src="${this.selectedCamera.stream_url}" alt="${this.selectedCamera.name}" />`;
  }

  static get properties() {
    return {
      hass: { type: Object },
      cameras: { type: Array },
      selectedCamera: { type: Object },
      focusOnMotion: { type: Boolean },
      thumbInterval: { type: Number },
      thumbPosition: { type: String },
      updateInterval: { type: Number },
      recordingDuration: { type: Number },
      showCaptureButtons: { type: Boolean },
      liveStream: { type: Boolean }
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
    this.liveStream = config.camera_view === "live";
    this.thumbPosition = config.thumb_position || "left";

    // There must be better way to tell if HA front end running from app or browser
    // Confirmed working on iOS, should be verified on Android app
    this.isMobileApp = navigator.userAgent.indexOf("HomeAssistant") > -1;

    const now = Date.now();
    this.cameras = config.cameras.map((camera) => {
      const { states = {} } = this.hass || {};
      const entity = states[camera.entity];
      const attributes = entity?.attributes;
      const motionEntities = Array.isArray(camera.motion_entity) ? camera.motion_entity : [camera.motion_entity].filter(entityId => !!entityId);

      return {
        access_token: attributes?.access_token,
        entity: camera.entity,
        motion_entities: motionEntities,
        name: attributes?.friendly_name,
        has_motion: motionEntities.some(entityId => states[entityId]?.state === "on"),
        last_motion: now,
        last_update: now,
        stream_url: "",
        url: attributes?.entity_picture,
      };
    });
    this.updateCameras = this.throttle(() => this._updateCameras(), this.thumbInterval);
    this._updateSelectedCamera();
  }

  _updateCameras() {
    const now = Date.now();
    const { states = {} } = this.hass || {};
    const activatedCameras = [];

    for (const camera of this.cameras) {
      const hadMotion = camera.has_motion === true;
      const { motion_entities } = camera;
      camera.has_motion = motion_entities.some(entityId => states[entityId]?.state === "on");
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

      const attributes = states[camera.entity]?.attributes || {};
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

      .container.thumbs-left {
      }

      .container.thumbs-right {
        flex-direction: row-reverse;
      }

      .container.thumbs-top {
        flex-direction: column;
      }

      .container.thumbs-top .thumbs {
        display: flex;
        flex: unset;
      }

      .container.thumbs-bottom {
        flex-direction: column-reverse;
      }

      .container.thumbs-bottom .thumbs {
        display: flex;
        flex: unset;
      }

      .container.thumbs-none .thumbs {
        display: none;
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
        background-image: url("data:image/svg+xml,%3Csvg width='978' height='978' viewBox='0 0 978 978' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M149.19 228.349H309.698V203.934C309.698 173.415 334.079 149 364.556 149H489H613.445C643.921 149 668.302 173.415 668.302 203.934V228.349H828.81C870.46 228.349 905 262.937 905 304.646V719.703C905 761.412 870.46 796 828.81 796H489H149.19C107.54 796 73 761.412 73 719.703V304.646C73 261.92 107.54 228.349 149.19 228.349ZM768 352V310H833V352H768ZM335 500.5C335 415.869 404.094 347 489 347C573.906 347 643 415.869 643 500.5C643 585.131 573.906 654 489 654C404.094 654 335 585.131 335 500.5Z' fill='url(%23paint0_linear)'/%3E%3Cdefs%3E%3ClinearGradient id='paint0_linear' x1='906.016' y1='484.708' x2='72.9999' y2='489.78' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0.493878' stop-color='%23F2FDFF'/%3E%3Cstop offset='0.509435' stop-color='%23FAFEFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E%0A");
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
        background-image: url("data:image/svg+xml,%3Csvg width='512' height='512' viewBox='0 0 512 512' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M471.28 120.129L386 196.769V313.089L471.12 391.488C477.6 397.504 487.728 397.121 493.728 390.641C496.464 387.697 497.984 383.825 498 379.809V132.129C498.064 123.297 490.96 116.081 482.128 116.001C478.128 115.969 474.256 117.441 471.28 120.129Z' fill='%23F2FDFF'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M386 160C386 124.656 357.344 96 322 96H202H82C46.656 96 18 124.656 18 160V352C18 387.344 46.656 416 82 416H202H322C357.344 416 386 387.344 386 352V160ZM122 255.5C122 211.669 157.893 176 202 176C246.107 176 282 211.669 282 255.5C282 299.331 246.107 335 202 335C157.893 335 122 299.331 122 255.5Z' fill='%23FAFEFF'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M322 96C357.344 96 386 124.656 386 160V352C386 387.344 357.344 416 322 416H202V335C246.107 335 282 299.331 282 255.5C282 211.669 246.107 176 202 176V96H322Z' fill='%23F2FDFF'/%3E%3C/svg%3E%0A");
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
