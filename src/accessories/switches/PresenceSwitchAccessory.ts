import { Logging } from 'homebridge';
import { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { OccupancySensorConfig, SwitchConfig } from '../../types/configs.js';
import { StorageLayer } from '../../utils/StorageLayer.js';
import { OccupancySensorAccessory } from '../OccupancySensorAccessory.js';
import { SwitchAccessory } from './SwitchAccessory.js';

export class PresenceSwitchAccessory extends SwitchAccessory {

  constructor(
    platform: SmartOccupancyHomebridgePlatform,
    occupancySensorAccessory: OccupancySensorAccessory,
    switchConfig: SwitchConfig,
    sensorConfig: OccupancySensorConfig,
    log: Logging,
    storage?: StorageLayer,
  ) {
    super(platform, occupancySensorAccessory, switchConfig, sensorConfig, log, storage);

    this.occupancySensorAccessory.occupancyStatus$.subscribe((occupied) => {
      const occupancyMightChange = this.occupancyMightChange();
      if (!occupancyMightChange) {
        return;
      }
      this.setStatus(occupied, { updateCharacteristic: true, triggerSwitchActions: false });
      this.log.debug(`${this.switchType}: ${this.switchConfig.name} occupancy status changed: ${occupied}, updating switch state`);
    });
  }

  protected triggerSwitchOnActions(): void {
    const occupancyMightChange = this.occupancyMightChange();
    if (!occupancyMightChange) {
      return;
    }

    if (!this.enoughTimeHasPassedSinceLastTrigger()) {
      this.log.info(`${this.switchType}: ${this.switchConfig.name} turned ON but not enough time has passed since last trigger. Ignoring action.`);
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      return;
    }

    if (this.otherSwitchHasDisabledOccupancy()) {
      this.log.debug(`${this.switchType}: Other switch has disabled occupancy, not changing occupancy status.`);
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      return;
    }

    this.log.info(`${this.switchType}: ${this.switchConfig.name} turned ON, setting occupancy to ON`);
    this.occupancySensorAccessory.setOccupancyStatus(true, { switchType: this.switchType, switchIdentifier: this.switchIdentifier });
  }

  protected triggerSwitchOffActions(): void {
    const occupancyMightChange = this.occupancyMightChange();
    if (!occupancyMightChange) {
      return;
    }
    const triggerSwitchIsMyself = this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchType === this.switchType
      && this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchIdentifier === this.switchIdentifier;

    const shouldGoUnoccupied = !this.switchState.isOn
      && this.occupancySensorAccessory.occupancySensorState.occupied
      && triggerSwitchIsMyself;

    if (shouldGoUnoccupied) {
      this.log.info(`${this.switchType}: ${this.switchConfig.name} turned OFF, setting occupancy to OFF`);
      this.occupancySensorAccessory.setOccupancyStatus(false, { switchType: this.switchType, switchIdentifier: this.switchIdentifier });
      return;
    }
  }
}