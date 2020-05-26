import {
  LitElement, html
} from 'https://unpkg.com/lit-element@2.3.1/lit-element.js?module';

class SurveillanceCard extends LitElement {
  /* eslint-disable indent,object-curly-newline */
  render() {
    const accessToken = this.currentCamera && this._hass.states[this.currentCamera] && this._hass.states[this.currentCamera].attributes.access_token;
    return html`
    <style>
      .container {
        height: 100%;
        width: 100%;
        display: flex;
        align-items: stretch;
        position: absolute;
        background: #000;
      }

      .thumbs {
        flex: 1;
        overflow-y: auto;
        position:relative;
      }

      .thumb > img {
        width: 100%;
        height: auto;
        border: 1px solid var(--primary-color);
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
        color: #FFF;
        text-align: center;
        font-size: 1.2rem;
        margin-top: 3rem;
      }
    </style>
    <div class="container">
      <div class="thumbs">
        ${this.imageSources ? this.cameras.map((camera) => {
      const thumbClass = this.lastMotion && this.lastMotion === camera.motion ? 'thumb motion' : 'thumb';
      const source = this.imageSources[camera.entity] || '';
      return html`
            <div class="${thumbClass}" @click="${() => { this.currentCamera = camera.entity; }}">
              <img src="${source}" />
            </div>
          `;
    }) : html`<div class="loading">Loading Cameras...</div>`}
      </div>
      <div class="mainImage">
        <img src="${this.currentCamera ? `/api/camera_proxy_stream/${this.currentCamera}?token=${accessToken}&interval=${this.updateInterval}` : ''}" />
      </div>
    </div>
    `;
  }
  /* eslint-enable indent,object-curly-newline */

  static get properties() {
    return {
      _hass: { type: Object },
      cameras: { type: Array },
      currentCamera: { type: String },
      imageSources: { type: Object },
      lastMotion: { type: String },
      thumbInterval: { type: Number },
      updateInterval: { type: Number }
    };
  }

  setConfig(config) {
    this.cameras = config.cameras.map(c => ({
      entity: c.entity,
      motion: c.motion_entity
    }));
    this.currentCamera = this.cameras[0].entity;
    this.thumbInterval = (config.thumb_interval || 10) * 1000;
    this.updateInterval = config.update_interval || 1;
    this.focusMotion = config.focus_motion !== false;
  }

  set hass(hass) {
    this._hass = hass;

    for (const camera of this.cameras) {
      const { motion } = camera;
      if ((motion in hass.states) && hass.states[motion].state === 'on') {
        if (this.focusMotion && this.lastMotion !== motion) {
          this.currentCamera = camera.entity;
        }
        this.lastMotion = motion;
        return;
      }
    }
    this.lastMotion = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.thumbUpdater = setInterval(() => this._updateThumbs(), this.thumbInterval);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.thumbUpdater);
    this.imageSources = null;
    this.currentCamera = '';
  }

  _firstRendered() {
    this._updateThumbs();
  }

  async _updateCameraImageSrc(entity) {
    try {
      const { content_type: contentType, content } = await this._hass.callWS({
        type: 'camera_thumbnail',
        entity_id: entity,
      });

      return {
        entityId: entity,
        src: `data:${contentType};base64, ${content}`
      };
    } catch (err) {
      return {
        entityId: entity,
        src: null
      };
    }
  }

  _updateThumbs() {
    const sources = {};
    const promises = this.cameras.map(camera => this._updateCameraImageSrc(camera.entity));
    Promise.all(promises).then((vals) => {
      this.cameras.forEach((camera) => {
        const target = vals.find(val => val.entityId === camera.entity);
        sources[camera.entity] = target.src;
      });
      this.imageSources = sources;
    });
  }
}
customElements.define('surveillance-card', SurveillanceCard);