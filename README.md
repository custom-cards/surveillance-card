Custom component for lovelace to be used as a panel for viewing security cameras. It shows all of the cameras on the left, and shows a big one with motion on the right.
![Screenshot](/surveillancecard.png)


**Note: When including this file in your `ui-lovelace.yaml` you must use `type: module`**

## Config

| Name | Type | Description | Default
| ---- | ---- | ----------- | -------
| type | string | `custom:surveillance-card` | **Required**
| cameras | list | _See camera section below_ | **Required**
| thumb_interval | number | Update interval for thumbnails in seconds (_min_ 0.5) | 10
| update_interval | number | Update interval for main image in seconds (_min_ 0.5) | 1
| show_capture_buttons | boolean | Show screenshot and record buttons | true
| recording_duration | number | Number of seconds to record after clicking record button (_min_ 0.5) | 10
| focus_motion | boolean | Switch to camera when motion detected | true

### Camera configuration

Each entry in the camera list takes the following options

| Name | Type | Description | Default
| ---- | ---- | ----------- | -------
| entity | string | Camera entity_id | **Required**
| motion_entity | string | entity_id of a binary sensor to use for motion detection (_uses state=='on' as motion detected_) | none

## Installation

### Step 1

Install `surveillance-card` by copying `surveillance-card.js`, `record.svg`, and `snapshot.svg` from this repo to `<config directory>/www/surveillance-card/` on your Home Assistant instance.

**Example:**

```bash
mkdir <config directory>/www/surveillance-card/
cd <config directory>/www/surveillance-card/

wget https://raw.githubusercontent.com/custom-cards/surveillance-card/master/surveillance-card.js
wget https://raw.githubusercontent.com/custom-cards/surveillance-card/master/record.svg
wget https://raw.githubusercontent.com/custom-cards/surveillance-card/master/snapshot.svg
```

### Step 2

Link `surveillance-card` inside you `ui-lovelace.yaml`.

```yaml
resources:
  - url: /local/surveillance-card.js?v=0
    type: module
```

### Step 3

Add as custom card of a panel view in your `ui-lovelace.yaml` using `type: custom:surveillance-card`

## Example
```yaml
views:
  - title: Surveillance
    icon: mdi:cctv
    panel: true
    cards:
      - type: custom:surveillance-card
        thumb_interval: 15
        update_interval: 2
        recording_duration: 10
        show_capture_buttons: true
        cameras:
          - entity: camera.front_porch
            motion_entity: binary_sensor.front_porch_motion
          - entity: camera.back_yard
            motion_entity: binary_sensor.back_yard_motion
          - entity: camera.driveway
```

## Saving Snapshots from Cameras

Clicking on the *camera button* will save a single snapshot from that camera.

Clicking the *record button* will grab as many images as it can (based on the update intervals) for the set `recording_duration`

Note: This functionality is not available in native app versions (iOS & Android) and depends on the browser/device's ability to download image files.


## Thanks

Thanks to all the people who have contributed!

[![contributors](https://contributors-img.web.app/image?repo=custom-cards/surveillance-card)](https://github.com/custom-cards/surveillance-card/graphs/contributors)
