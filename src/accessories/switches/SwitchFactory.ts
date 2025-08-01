import { Logging } from 'homebridge';
import { NotificationSwitchConfig, OccupancySensorConfig, SwitchConfig, SwitchType } from '../../types/configs.js';
import { NotificationSwitchAccessory } from './NotificationSwitchAccessory.js';
import { OccupancySwitchAccessory } from './OccupancySwitchAccessory.js';
import { PresenceSwitchAccessory } from './PresenceSwitchAccessory.js';
import { TriggerShutoffSwitchAccessory } from './TriggerShutoffSwitchAccessory.js';
import { StayOnSwitchAccessory } from './StayOnSwitchAccessory.js';
import { SwitchAccessory } from './SwitchAccessory.js';
import { TriggerOccupancySwitchAccessory } from './TriggerOccupancySwitchAccessory.js';
import { TriggerStayOnSwitchAccessory } from './TriggerStayOnSwitchAccessory.js';
import { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { OccupancySensorAccessory } from '../OccupancySensorAccessory.js';
import { StorageLayer } from '../../utils/StorageLayer.js';
import { MasterSwitchAccessory } from './MasterSwitchAccessory.js';
import { DisableOccupancySwitchAccessory } from './DisableOccupancySwitchAccessory.js';

export class SwitchFactory {

  static createSwitch(
    platform: SmartOccupancyHomebridgePlatform,
    occupancySensorAccessory: OccupancySensorAccessory,
    switchConfig: SwitchConfig,
    sensorConfig: OccupancySensorConfig,
    log: Logging,
    storage?: StorageLayer,
  ): SwitchAccessory {
    switch (switchConfig.type) {
    case SwitchType.PRESENCE_SWITCH:
      return new PresenceSwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, log, storage);
    case SwitchType.NOTIFICATION_SWITCH:
      return new NotificationSwitchAccessory(platform, occupancySensorAccessory, switchConfig as NotificationSwitchConfig, sensorConfig, log, storage);
    case SwitchType.OCCUPANCY_SWITCH:
      return new OccupancySwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, log, storage);
    case SwitchType.TRIGGER_OCCUPANCY_SWITCH:
      return new TriggerOccupancySwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, log, storage);
    case SwitchType.STAY_ON_SWITCH:
      return new StayOnSwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, log, storage);
    case SwitchType.TRIGGER_STAY_ON_SWITCH:
      return new TriggerStayOnSwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, log, storage);
    case SwitchType.MASTER_SWITCH:
      return new MasterSwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, log, storage);
    case SwitchType.DISABLE_OCCUPANCY_SWITCH:
      return new DisableOccupancySwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, log, storage);
    case SwitchType.TRIGGER_SHUTOFF_SWITCH:
      return new TriggerShutoffSwitchAccessory(platform, occupancySensorAccessory, switchConfig, sensorConfig, log, storage);
    default:
      throw new Error(`Unknown switch type: ${switchConfig.type}`);
    }
  }

}