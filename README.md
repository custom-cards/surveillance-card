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
| focus_motion | boolean | Switch to camera when motion detected | true

### Camera configuration

Each entry in the camera list takes the following options

| Name | Type | Description | Default
| ---- | ---- | ----------- | -------
| entity | string | Camera entity_id | **Required**
| motion_entity | string | entity_id of a binary sensor to use for motion detection (_uses state=='on' as motion detected_) | none

## Installation

### Step 1

Install `surveillance-card` by copying `surveillance-card.js`from this repo to `<config directory>/www/` on your Home Assistant instance.

**Example:**

```bash
wget https://raw.githubusercontent.com/custom-cards/surveillance-card/master/surveillance-card.js
mv surveillance-card.js /config/www/
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
        cameras:
          - entity: camera.front_porch
            motion_entity: binary_sensor.front_porch_motion
          - entity: camera.back_yard
            motion_entity: binary_sensor.back_yard_motion
          - entity: camera.driveway
```
