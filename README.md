# Surveillance Card
Surveillance Card is a custom component for lovelace to be used as a panel for viewing security cameras. It shows all of the cameras on the left, and shows a big one with motion on the right.

![GitHub release (latest by date)](https://img.shields.io/github/v/release/custom-cards/surveillance-card?color=green&display_name=tag&style=for-the-badge)
![Apache 2.0](https://img.shields.io/github/license/custom-cards/surveillance-card?color=blue&style=for-the-badge)
![hacs_badge](https://img.shields.io/badge/HACS-Default-blue.svg?style=for-the-badge)

![Screenshot](/surveillancecard.png)

---

## Configuration Parameters

| Name | Type | Description | Default
| ---- | ---- | ----------- | -------
| type | string | `custom:surveillance-card` | **Required**
| cameras | list | _See camera section below_ | **Required**
| thumb_interval | number | Update interval for thumbnails in seconds (_min_ 0.5) | 10
| update_interval | number | Update interval for main image in seconds (_min_ 0.5) | 1
| show_capture_buttons | boolean | Show screenshot and record buttons | true
| recording_duration | number | Number of seconds to record after clicking record button (_min_ 0.5) | 10
| focus_motion | boolean | Switch to camera when motion detected | true
| camera_view | string | “live” will show the live view if  the `stream` integration is enabled. | ""
| thumb_position | string | Position of the thumbnails (left, right, top, botton, none) | left

### Camera Parameters

Each entry in the camera list takes the following options

| Name | Type | Description | Default
| ---- | ---- | ----------- | -------
| entity | string | Camera entity_id | **Required**
| motion_entity | string | entity_id of a binary sensor to use for motion detection (_uses state=='on' as motion detected_) | none

---

## Install Using HACS

### Simple Install (Requires Core 2022.8 or newer)
[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://img.shields.io/badge/HACS-Install-blue?style=for-the-badge)](https://my.home-assistant.io/redirect/hacs_repository/?owner=custom-cards&repository=custom-cards%2Fsurveillance-card)

### Manually Install through HACS
1. Make sure you have the latest version of HACS installed. [HACS install guide](https://hacs.xyz/docs/setup/prerequisites)
2. Log in as an Admin and go to HACS > Frontend > Explore and Download Repositories > Search for "surveillance-card" and select it from the list
3. Click download on the bottom right
4. Reload your browser when prompted

### Add Card To Dashboard

> **Note** For the page you create, make sure to set the View Type to "Panel (1 card)"
1. Create a new dashboard or select the dashboard you wish to use (must be a UI configured dashboard, use 3b for YAML)
2. Click the menu button (top right 3 dots) and select edit
3. Add a "Manual Card" to your screen
4. Fill out options like the example below

```yaml
type: custom:surveillance-card
thumb_interval: 15
update_interval: 2
recording_duration: 10
show_capture_buttons: true
camera_view: ""
cameras:
  - entity: camera.front_porch
    motion_entity: binary_sensor.front_porch_motion
  - entity: camera.back_yard
    motion_entity: binary_sensor.back_yard_motion
```

---

## Saving Snapshots from Cameras

Clicking on the *camera button* will save a single snapshot from that camera.

Clicking the *record button* will grab as many images as it can (based on the update intervals) for the set `recording_duration`

Note: This functionality is not available in native app versions (iOS & Android) and depends on the browser/device's ability to download image files.

---

## Thanks

Thanks to all the people who have contributed!

[![contributors](https://contributors-img.web.app/image?repo=custom-cards/surveillance-card)](https://github.com/custom-cards/surveillance-card/graphs/contributors)

