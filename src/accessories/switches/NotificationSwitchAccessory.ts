import { Logging } from 'homebridge';
import { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { NotificationSwitchConfig, OccupancySensorConfig } from '../../types/configs.js';
import { OccupancySensorAccessory } from '../OccupancySensorAccessory.js';
import { SwitchAccessory } from './SwitchAccessory.js';
import { map, take, takeUntil, timer } from 'rxjs';
import { StorageLayer } from '../../utils/StorageLayer.js';

export class NotificationSwitchAccessory extends SwitchAccessory<NotificationSwitchConfig> {

  constructor(
    platform: SmartOccupancyHomebridgePlatform,
    occupancySensorAccessory: OccupancySensorAccessory,
    switchConfig: NotificationSwitchConfig,
    sensorConfig: OccupancySensorConfig,
    log: Logging,
    storage?: StorageLayer,
  ) {
    super(platform, occupancySensorAccessory, switchConfig, sensorConfig, log, storage);

    this.occupancySensorAccessory.timerStarted$.subscribe(() => {
      const timerDurationSeconds = this.occupancySensorAccessory.occupancySensorState.nextDelaySeconds * (this.switchConfig.notificationThreshold / 100);
      if (timerDurationSeconds < this.switchConfig.minimumNotificationTime) {
        return;
      }
      this.log.debug(`${this.switchType}: ${this.switchConfig.name} will trigger after ${timerDurationSeconds} seconds`);
      timer(timerDurationSeconds * 1000).pipe(
        takeUntil(
          this.occupancySensorAccessory.timerCancelled$
            .pipe(
              take(1),
              map((cancelledEvent) => {
                this.log.debug(`${this.switchType}: ${this.switchConfig.name} timer cancelled`);
                return cancelledEvent;
              }),
            ),
        ),
      ).subscribe(() => {
        this.log.info(`${this.switchType}: ${this.switchConfig.name} triggered after ${timerDurationSeconds} seconds`);
        this.setStatus(true);
      });
    });
  }

  protected triggerSwitchActions(): void {
    if (!this.switchState.isOn) {
      this.log.warn(`${this.switchType}: ${this.switchConfig.name} is OFF, no action taken`);
      return;
    }
    setTimeout(() => {
      this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false });
      this.log.info(`${this.switchType}: ${this.switchConfig.name} turned OFF, no action required`);
    }, this.MANUAL_STATUS_CHANGE_TIMEOUT);
  }
}

