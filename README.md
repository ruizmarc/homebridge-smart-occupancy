<p align="center">
   <a href="https://github.com/ruizmarc/homebridge-smart-occupancy"><img alt="Smart Occupancy Homebridge" src="https://github.com/ruizmarc/homebridge-smart-occupancy/assets/5717082/267ea081-2be2-4712-bb89-48d750124f3f" width="600px"></a>
</p>

<span align="center">

# Smart Occupancy Homebridge

<!-- [![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) -->
[![npm](https://img.shields.io/npm/dt/homebridge-smart-occupancy
)](https://www.npmjs.com/package/homebridge-smart-occupancy)
[![npm](https://img.shields.io/npm/v/homebridge-smart-occupancy
)](https://www.npmjs.com/package/homebridge-smart-occupancy)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/ruizmarc/homebridge-smart-occupancy)](https://github.com/ruizmarc/homebridge-smart-occupancy/pulls)
[![GitHub issues](https://img.shields.io/github/issues/ruizmarc/homebridge-smart-occupancy)](https://github.com/ruizmarc/homebridge-smart-occupancy/issues)

Create flexible and customizable occupancy sensors for Homebridge with extra switches and triggers to control sensor and occupancy delay behavior.

</span>

### Table of Contents
- [Smart Occupancy Homebridge](#smart-occupancy-homebridge)
    - [Table of Contents](#table-of-contents)
    - [Plugin summary](#plugin-summary)
    - [Use cases](#use-cases)
    - [Switch Types description](#switch-types-description)
      - [Switches priority order](#switches-priority-order)
    - [HomeKit Automations](#homekit-automations)
    - [Configuration](#configuration)
      - [Sensor configuration](#sensor-configuration)
      - [Switches configuration](#switches-configuration)
    - [Thanks and caveats](#thanks-and-caveats)

### Plugin summary

This plugin allows you to create flexible and customizable occupancy sensors for Homebridge. It supports multiple sensors, each with its own configuration, and provides additional switches and triggers to control sensor behavior and occupancy delay.

* Add as many occupancy sensors as you need.
* Each sensor can have its own independent configuration.
* Occupancy can have a delay before turning off.
* Supports two occupancy delay modes:
  * Fixed: The sensor will remain occupied for a fixed amount of time after the last detected motion.
  * Progressive: The sensor will adjust the occupancy delay based on the last detected motion.
* Allow a timeout for occupancy to be triggered on again, useful for preventing rapid re-triggering such as motion sensors detectiong motion when turning off a light.
* Supports multiple occupancy triggers by using switches to trigger occupancy events and control the occupancy delay.
* All sensor and switches state can be restored after bridge restart.
* Get notified about occupancy delay progress by using a notification switch.
* Disable occupancy sensor with a switch.
* Sensor can have a maximum time to stay occupied, after which it will be automatically turned off.

### Use cases

This plugin is designed to create flexible occupancy sensors that can be used in as many scenarios as possible, but the essential idea behind it is to provide a way to control occupancy sensors as you would expect them to behave in a real-world scenario, for example, when turning on/off lights based on occupancy. If lights are turned on by a motion sensor you would want them to turn off when motion stops. However, if you turned on the lights manually, they should stop whenever you want them to stop, not when the motion sensor detects no motion. This is just a simple example about how this plugin can be used, but there are many other use cases.

Another example of a situation in which this plugin can be useful is to control occupancy sensors in areas with changing activity duration, so you would like the delay to turn off occupancy to adapt to such activity. If the motion detection is very frequent, the delay to turn off occupancy should be longer, for example when working in your desk you might want the lights to stay on longer even if you don't move for a few seconds; otherwise, if the motion detection is less frequent, the delay should be shorter, for example, when just entering your desk's room just to get something and leave. It is easy to achieve this by using the progressive delay mode, which will increase the delay duration with each motion detection until it reaches the configured occupancy delay.

We can find other less common use cases, if you have a hallway light that you want to turn on when the garage opens and then keep it on as long as you have motion anywhere in the house or until it reaches a maximum timeout. However you wouldn't want motion in the house to normally turn the light on. Using a combination of occupancy switch and stay-on switch and adding a timeout config you would be able to achieve this.

And if you like to bring your interaction with your surroundings to the next level, you could use this plugin to notify you when the occupancy delay is approaching to the end, so you will know when the lights are about to turn off by using a notification switch that dims the lights when the occupancy delay is about to end before they totally turn off so you can take action if you want to keep them on.

You can also disable the occupancy sensor so it never triggers, for example if you have organized a films night or when you are taking a nap and don't want the lights to turn on/off automatically. 

The combinations are endless, and you will find a way to fit your own scenarios. The plugin might sound quite complex when you first look at it, but that's also what makes it powerful and you will find that it is easy to use when you start experimenting with it. However, if you mess it up with the switches, the plugin also has a switch for you to reset the occupancy status to start over.


### Switch Types description

* **Occupancy Switch**: It will activate the occupancy sensor, but delay won't start until it turns off.
* **Trigger Occupancy Switch**: It will trigger the occupancy sensor and it will automatically start the delay.
* **Stay-on Switch**: It will keep the occupancy sensor active while switch is on if occupancy is already on, otherwise it will do nothing.
* **Stay-on Trigger Switch**: It will reset the delay when switch is on if occupancy is already on, otherwise it will do nothing.
* **Presence Switch**: It mimics the status of the occupancy sensor. If activated before occupancy is on, it will turn on the occupancy sensor and keep it active until it is turned off by turning off the presence switch.
* **Occupancy Progress Notification Switch**: It will toggle on and off after the occupancy delay reaches the configured time. Useful to notify other automations the occupancy delay is progress.
* **Master Switch**: It will turn on/off occupancy sensor by stopping any action by any other trigger.
* **Disable Occupancy Switch**: It will turn off and disable the occupancy sensor, so it will not trigger occupancy events. This is useful to prevent the occupancy sensor from turning on when you don't want it to.
* **Trigger Shutoff Switch**: It will turn off the occupancy sensor and stop the delay.

#### Switches priority order

When using multiple switches, it is important to understand how they interact with each other. Each switch has a specific role and priority, and they can affect the occupancy sensor's behavior in different ways.
In case multiple switches are configured, there is a priority order to determine which switch will take precedence over the others. The order is as follows:
1. **Master Switch** It has the highest priority and will always take precedence over any other switch. If it is turned on, it will turn on the occupancy sensor and keep it active until it is turned off, while turning off the rest of the switches.
2. **Disable Occupancy Switch** and **Trigger Shutoff Switch**: If a any of them are used, they will take precedence over all other switches and will turn off all of them and the occupancy sensor.
3. **Occupancy Switch** and **Stay on Switch**: If any of the two are on, no other switch will be able to turn off the occupancy sensor except for themselves and the Master, Disable or Trigger Shutoff Switch, not even those triggering a delay as delay will not get activated.
4. **Presence Switch**: Presence switch will always do what the occupancy sensor is doing, so it will not take precedence over any other switch, except in case the occupancy sensor is off and the presence switch is turned on, in this case, it will turn on the occupancy sensor and keep it active until it is turned off as the highest priority switch except for the Master, Disable or Trigger Shutoff Switch.
5. **Trigger Occupancy Switch** and **Trigger Stay on Switch**: If any of the two are triggered, they will start the delay to turn off the occupancy sensor however, if any other switch triggering a delay activates the delay, for example turning off the `Occupancy Switch`, the current delay count will be cancelled and a new delay will start from the beginning.
6. **Occupancy Progress Notification Switch**: As it is only a signal, it does not affect the rest of switches.

### HomeKit Automations

Here are some examples of HomeKit automations you can create with this plugin:

* When Hallway Lights turn on -> Turn on Hallway Presence Switch
* When Hallway Lights turn off -> Turn off Hallway Presence Switch
* When Hallway Occupancy Sensor Detects Occupancy -> Turn on Hallway Light
* When Hallway Occupancy Sensor Stops Detecting Occupancy -> Turn off Hallway Light
* When Hallway Motion Sensor Detects Motion -> Turn on Hallway Occupancy Switch
* When Hallway Motion Sensor Stops Detecting Motion -> Turn off Hallway Occupancy Switch
* When Hallway Notification Ending Occupancy Switch toggles on -> Dim Hallway Lights to 50%

Now, when the Hallway Lights are manually turned on or off, they stay on until the switch is manually turned back off. When the Hallway Lights are turned on by the motion sensor, they automatically turn off `stayOccupiedDelay` after motion stops but before the occupancy delay elapses, when the occupancy sensor delay reaches `notificationThreshold` it will toggle the notification switch on and off to notify you that the occupancy delay is about to end, and the lights will dim to 50% to let you know that they are about to turn off.

Additional Advanced HomeKit Automations

* When Garage Door Is Opened -> Turn on Hallway Occupancy Trigger Switch
* When Kitchen Motion Sensor Detects Motion -> Turn on Hallway Stay-on Trigger Switch
* When Dining Room Lights Turn on -> Turn on Hallway Stay-on Switch
* When Dining Room Lights Turn off -> Turn off Hallway Stay-on Switch

These automations add the fancy elements of turning on the hallway lights when the garage opens, keeping the hallway lights on for longer if they're already on and the kitchen lights turn on, and keeping the hallway lights on as long as the dining room lights are on (if the hallway lights are already on).

### Configuration

* Run this plugin as a [Child Bridge](https://github.com/homebridge/homebridge/wiki/Child-Bridges) (Highly Recommended), this prevent crash Homebridge if plugin crashes.
* Install and use [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x/wiki) to configure this plugin (Highly Recommended).
* Be sure to always make a backup copy of your config.json file before making any changes to it. 

<details>
  <summary>JSON Configuration example</summary>

  ``` json
{
  "name": "homebridge-smart-occupancy",
  "platform": "SmartOccupancy",
  "sensors": [
    {
      "name": "Desk sensor",
      "identifier": "desk-sensor",
      "stayOccupiedDelay": 30,
      "stayOccupiedTimeout": 0,
      "newOccupancyTimeout": 0,
      "progressiveDelay": true,
      "progressionStart": 5,
      "progressionStep": 5,
      "persistStatusAcrossReboots": true,
      "alwaysBootAsOccupied": false,
      "switches": [
        {
          "name": "Desk occupancy switch",
          "type": "OCCUPANCY_SWITCH",
          "identifier": "desk-occupancy-switch"
        },
        {
          "name": "Desk occupancy trigger switch",
          "type": "TRIGGER_OCCUPANCY_SWITCH",
          "identifier": "desk-occupancy-trigger-switch"
        },
        {
          "name": "Desk stay on switch",
          "type": "STAY_ON_SWITCH",
          "identifier": "desk-stay-on-switch"
        },
        {
          "name": "Desk stay on trigger switch",
          "type": "TRIGGER_STAY_ON_SWITCH",
          "identifier": "desk-stay-on-trigger-switch"
        },
        {
          "name": "Desk light switch",
          "type": "PRESENCE_SWITCH",
          "identifier": "desk-light-switch"
        },
        {
          "name": "Desk occupancy notification switch",
          "type": "NOTIFICATION_SWITCH",
          "identifier": "desk-occupancy-notification-switch",
          "notificationThreshold": 75,
          "minimumNotificationTime": 5
        },
        {
          "name": "Desk master switch",
          "type": "MASTER_SWITCH",
          "identifier": "desk-master-switch"
        },
        {
          "name": "Desk disable occupancy switch",
          "type": "DISABLE_OCCUPANCY_SWITCH",
          "identifier": "desk-disable-occupancy-switch"
        },
        {
          "name": "Desk shutoff switch",
          "type": "TRIGGER_SHUTOFF_SWITCH",
          "identifier": "desk-shutoff-trigger-switch"
        }
      ]
    }
  ]
}
```
</details>

#### Sensor configuration
| Name                          | Key                          | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sensor Name                   | `name`                       | Name for the sensor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Identifier                    | `identifier`                 | Unique identifier for the sensor. Leave empty to auto-generate. If you set a value, it must be unique across all sensors. If you do not set a value, identifier will change when name changes which might break automations                                                                                                                                                                                                                                                                                                                                                                                               |
| Stay Occupied Delay           | `stayOccupiedDelay`          | Time in seconds before the sensor turns off automatically. Set 0 to shutoff as soon as not occupied.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Stay Occupied Timeout         | `stayOccupiedTimeout`        | Set the maximum time in seconds that occupancy sensor can stay as occupied. When timeout is reached sensor and all switches will be turned off. Set to 0 to keep it occupied indefinitely until any other trigger turns it off.                                                                                                                                                                                                                                                                                                                                                                                           |
| New Occupancy Timeout         | `newOccupancyTimeout`        | Time in seconds to wait before being able to trigger a new occupancy event after the latest one. The first one will trigger immediately.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Progressive Delay             | `progressiveDelay`           | Enable progressive delay to increase the delay duration with each delay activation until it reaches your delay config. This is useful when motion sensors are used in areas with frequent activity, allowing the delay to adapt to usage, for example if they are entering or leaving the covered area by the sensor frequently so that you want to avoid unnecessary on/off triggers.<br />When enabled, the delay will start at the configured `progressionStart` value and increase by `progressionStep` seconds each time the delay is cancelled by another activation until it reaches the configured `delay` value. |
| Progressive Delay Start       | `progressionStart`           | Initial delay value in seconds for the progressive delay.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Progressive Delay Step        | `progressionStep`            | Step in seconds to increase the delay duration when progressive delay is enabled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Persist Status Across Reboots | `persistStatusAcrossReboots` | If enabled, the sensor status will be persisted across reboots. If disabled, the sensor will always start as not occupied                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Always Boot as Occupied       | `alwaysBootAsOccupied`       | If enabled, the sensor will always boot as occupied regardless of previous status.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

#### Switches configuration
| Name                      | Key                       | Description                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Switch Name               | `name`                    | Name for the switch                                                                                                                                                                                                                                                                                                                            |
| Identifier                | `identifier`              | Unique identifier for the switch. Leave empty to auto-generate. If you set a value, it must be unique across all switches. If you do not set a value, identifier will change when name changes which might break automations.                                                                                                                  |
| Switch Type               | `type`                    | Type of the switch. Possible values are: `OCCUPANCY_SWITCH`, `TRIGGER_OCCUPANCY_SWITCH`, `STAY_ON_SWITCH`, `TRIGGER_STAY_ON_SWITCH`, `PRESENCE_SWITCH`, `NOTIFICATION_SWITCH`, `MASTER_SWITCH`, `TRIGGER_SHUTOFF_SWITCH`. For more information on each switch type, please refer to the [Switch Types description](#switch-types-description). |
| Notification Threshold    | `notificationThreshold`   | Threshold in percentage to trigger the notification switch. This is only used for `NOTIFICATION_SWITCH` type. If the occupancy delay reaches this threshold, the switch will toggle on and off.                                                                                                                                                |
| Minimum Notification Time | `minimumNotificationTime` | Minimum number of seconds required to trigger a notification regardless of the notification threshold. If the delay after applying the threshold is less than this time, the notification will not be triggered. This is only used for `NOTIFICATION_SWITCH` type.                                                                                                               |


### Thanks and caveats

Smart Occupancy Homebridge is a hobby project of mine, provided as-is, with no warranty whatsoever. I'm running it successfully at home since I created it, but your mileage might vary.

If you miss a feature and want to contribute, feel free to open a pull request. [GitHub Pull Requests](https://github.com/ruizmarc/homebridge-smart-occupancy/pulls).

If you find any bugs, please report them in the [GitHub issues](https://github.com/marcruiz/homebridge-smart-occupancy/issues).

Special thanks to [@Jason-Morcos/homebridge-magic-occupancy](https://github.com/Jason-Morcos/homebridge-magic-occupancy). This plugin was inspired by that project, but has been completely reimagined and built from the ground up with a different approach, enabling many new features and greater extensibility, flexibility, and customizability.