import { Logging } from 'homebridge';
import { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { OccupancySensorConfig, SwitchConfig } from '../../types/configs.js';
import { OccupancySensorAccessory } from '../OccupancySensorAccessory.js';
import { SwitchAccessory } from './SwitchAccessory.js';
import { StorageLayer } from '../../utils/StorageLayer.js';
import { delay } from 'rxjs';

export class CancelDelayNotificationSwitchAccessory extends SwitchAccessory {

  constructor(
    platform: SmartOccupancyHomebridgePlatform,
    occupancySensorAccessory: OccupancySensorAccessory,
    switchConfig: SwitchConfig,
    sensorConfig: OccupancySensorConfig,
    log: Logging,
    storage?: StorageLayer,
  ) {

    super(platform, occupancySensorAccessory, switchConfig, sensorConfig, log, storage);

    this.occupancySensorAccessory.timerCancelled$
      .pipe(
        delay(500),
      )
      .subscribe(() => {
        if (!this.occupancySensorAccessory.occupancySensorState.occupied) {
          this.log.debug(`${this.switchType}: ${this.switchConfig.name} received timer cancelled event, but sensor is not occupied, not action taken`);
          return;
        }
        this.log.info(`${this.switchType}: ${this.switchConfig.name} received timer cancelled event`);
        this.setStatus(true, { updateCharacteristic: true, triggerSwitchActions: true });
      });
  }

  protected triggerSwitchOnActions(): void {
    setTimeout(() => {
      this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false });
      this.log.info(`${this.switchType}: ${this.switchConfig.name} turned OFF, no action required`);
    }, this.MANUAL_STATUS_CHANGE_TIMEOUT);
  }

  protected triggerSwitchOffActions(): void {
    this.log.warn(`${this.switchType}: ${this.switchConfig.name} is OFF, no action taken`);
  }
}

