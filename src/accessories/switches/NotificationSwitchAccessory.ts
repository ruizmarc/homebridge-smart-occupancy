import { Logging } from 'homebridge';
import { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { NotificationSwitchConfig, OccupancySensorConfig } from '../../types/config.js';
import { OccupancySensorAccessory } from '../OccupancySensorAccessory.js';
import { SwitchAccessory } from './SwitchAccessory.js';
import { map, take, takeUntil, timer } from 'rxjs';

export class NotificationSwitchAccessory extends SwitchAccessory<NotificationSwitchConfig> {

  constructor(
    platform: SmartOccupancyHomebridgePlatform,
    occupancySensorAccessory: OccupancySensorAccessory,
    switchConfig: NotificationSwitchConfig,
    sensorConfig: OccupancySensorConfig,
    persistPath: string,
    log: Logging,
  ) {
    super(platform, occupancySensorAccessory, switchConfig, sensorConfig, persistPath, log);

    this.occupancySensorAccessory.timerStarted$.subscribe(() => {
      const timerDurationSeconds = this.occupancySensorAccessory.occupancySensorState.nextDelaySeconds * (this.switchConfig.notificationThreshold / 100);
      if (timerDurationSeconds < this.switchConfig.minimumNotificationTime) {
        return;
      }
      this.log.debug(`${this.switchConfig.type}: ${this.switchConfig.name} will trigger after ${timerDurationSeconds} seconds`);
      timer(timerDurationSeconds * 1000).pipe(
        takeUntil(
          this.occupancySensorAccessory.timerCancelled$
            .pipe(
              take(1),
              map((cancelledEvent) => {
                this.log.debug(`${this.switchConfig.type}: ${this.switchConfig.name} timer cancelled`);
                return cancelledEvent;
              }),
            ),
        ),
      ).subscribe(() => {
        this.log.info(`${this.switchConfig.type}: ${this.switchConfig.name} triggered after ${timerDurationSeconds} seconds`);
        this.setStatus(true);
      });
    });
  }

  protected triggerSwitchActions(): void {
    if (!this.switchState.isOn) {
      this.log.warn(`${this.switchConfig.type}: ${this.switchConfig.name} is OFF, no action taken`);
      return;
    }
    setTimeout(() => {
      this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false });
      this.log.info(`${this.switchConfig.type}: ${this.switchConfig.name} turned OFF, no action required`);
    }, this.MANUAL_STATUS_CHANGE_TIMEOUT);
  }
}

