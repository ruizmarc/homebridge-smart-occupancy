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
      const timerDuration = this.sensorConfig.stayOccupiedDelay * (this.switchConfig.notificationThreshold / 100) * 1000;
      if (timerDuration < this.switchConfig.minimumNotificationTime) {
        return;
      }
      this.log.debug(`Notification switch ${this.switchConfig.name} will trigger after ${timerDuration / 1000} seconds`);
      timer(timerDuration).pipe(
        takeUntil(
          this.occupancySensorAccessory.timerCancelled$
            .pipe(
              take(1),
              map((cancelledEvent) => {
                this.log.debug(`Notification switch ${this.switchConfig.name} timer cancelled`);
                return cancelledEvent;
              }),
            ),
        ),
      ).subscribe(() => {
        this.log.info(`Notification switch ${this.switchConfig.name} triggered after ${timerDuration / 1000} seconds`);
        this.setStatus(true);
      });
    });
  }

  protected triggerSwitchActions(): void {
    if (!this.switchState.isOn) {
      this.log.warn(`Notification switch ${this.switchConfig.name} is OFF, no action taken`);
      return;
    }
    setTimeout(() => {
      this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false });
      this.log.info(`Notification switch ${this.switchConfig.name} turned OFF, no action required`);
    }, this.MANUAL_STATUS_CHANGE_TIMEOUT);
  }
}

