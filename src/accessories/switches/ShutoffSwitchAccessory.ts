import { Logging } from 'homebridge';
import { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { SwitchConfig, OccupancySensorConfig } from '../../types/config.js';
import { OccupancySensorAccessory } from '../OccupancySensorAccessory.js';
import { SwitchAccessory } from './SwitchAccessory.js';

export class ShutoffSwitchAccessory extends SwitchAccessory {

  constructor(
    platform: SmartOccupancyHomebridgePlatform,
    occupancySensorAccessory: OccupancySensorAccessory,
    switchConfig: SwitchConfig,
    sensorConfig: OccupancySensorConfig,
    persistPath: string,
    log: Logging,
  ) {
    super(platform, occupancySensorAccessory, switchConfig, sensorConfig, persistPath, log);
  }

  protected triggerSwitchActions(): void {
    this.log.info(`Shutoff switch ${this.switchConfig.name} changed to ${this.switchState.isOn ? 'ON' : 'OFF'}.`);
    if (!this.switchState.isOn) {
      return;
    }
    setTimeout(() => {
      this.log.info(`Shutoff switch ${this.switchConfig.name} triggered. Cancelling unoccupy timer and turning off occupancy sensor.`);
      this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
      const allSwitches = this.occupancySensorAccessory.switches.values();
      for (const switchAccessory of allSwitches) {
        this.log.debug(`Turning off switch ${switchAccessory.switchIdentifier} as part of shutoff action. ${switchAccessory.switchState.isOn}`);
        if (switchAccessory.switchState.isOn) {
          switchAccessory.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false });
        }
      }
      this.occupancySensorAccessory.setOccupancyStatus(false);
    }, this.MANUAL_STATUS_CHANGE_TIMEOUT);
  }
}
