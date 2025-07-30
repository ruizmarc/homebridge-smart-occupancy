import { Logging } from 'homebridge';
import { NotificationSwitchConfig, OccupancySensorConfig, SwitchConfig, SwitchType } from '../../types/config.js';
import { NotificationSwitchAccessory } from './NotificationSwitchAccessory.js';
import { OccupancySwitchAccessory } from './OccupancySwitchAccessory.js';
import { PresenceSwitchAccessory } from './PresenceSwitchAccessory.js';
import { ShutoffSwitchAccessory } from './ShutoffSwitchAccessory.js';
import { StayOnSwitchAccessory } from './StayOnSwitchAccessory.js';
import { SwitchAccessory } from './SwitchAccessory.js';
import { TriggerOccupancySwitchAccessory } from './TriggerOccupancySwitchAccessory.js';
import { TriggerStayOnSwitchAccessory } from './TriggerStayOnSwitchAccessory.js';
import { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { OccupancySensorAccessory } from '../OccupancySensorAccessory.js';

export class SwitchFactory {

  static createSwitch(
    platform: SmartOccupancyHomebridgePlatform,
    occupancySensorAccessory: OccupancySensorAccessory,
    switchConfig: SwitchConfig,
    sensorConfig: OccupancySensorConfig,
    persistPath: string,
    log: Logging,
  ): SwitchAccessory {
    switch (switchConfig.type) {
    case SwitchType.PRESENCE_SWITCH:
      return new PresenceSwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, persistPath, log);
    case SwitchType.NOTIFICATION_SWITCH:
      return new NotificationSwitchAccessory(platform, occupancySensorAccessory, switchConfig as NotificationSwitchConfig, sensorConfig, persistPath, log);
    case SwitchType.OCCUPANCY_SWITCH:
      return new OccupancySwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, persistPath, log);
    case SwitchType.TRIGGER_OCCUPANCY_SWITCH:
      return new TriggerOccupancySwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, persistPath, log);
    case SwitchType.STAY_ON_SWITCH:
      return new StayOnSwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, persistPath, log);
    case SwitchType.TRIGGER_STAY_ON_SWITCH:
      return new TriggerStayOnSwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, persistPath, log);
    case SwitchType.SHUTOFF_SWITCH:
      return new ShutoffSwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, persistPath, log);
    default:
      throw new Error(`Unknown switch type: ${switchConfig.type}`);
    }
  }

}