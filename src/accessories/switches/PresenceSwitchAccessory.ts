import { Logging } from 'homebridge';
import { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { OccupancySensorConfig, SwitchConfig } from '../../types/config.js';
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
      this.log.debug(`${this.switchConfig.type}: ${this.switchConfig.name} occupancy status changed: ${occupied}, updating switch state`);
    });
  }

  protected triggerSwitchActions(): void {
    const occupancyMightChange = this.occupancyMightChange();
    if (!occupancyMightChange) {
      return;
    }

    const shouldGoOccupied = this.shouldGoOccupied();
    if (shouldGoOccupied) {
      this.log.info(`${this.switchConfig.type}: ${this.switchConfig.name} turned ON, setting occupancy to ON`);
      this.occupancySensorAccessory.setOccupancyStatus(true, { switchType: this.switchConfig.type, switchIdentifier: this.switchIdentifier });
      return;
    }

    const triggerSwitchIsMyself = this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchType === this.switchConfig.type
      && this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchIdentifier === this.switchIdentifier;

    const shouldGoUnoccupied = !this.switchState.isOn
      && this.occupancySensorAccessory.occupancySensorState.occupied
      && triggerSwitchIsMyself;

    if (shouldGoUnoccupied) {
      this.log.info(`${this.switchConfig.type}: ${this.switchConfig.name} turned OFF, setting occupancy to OFF`);
      this.occupancySensorAccessory.setOccupancyStatus(false, { switchType: this.switchConfig.type, switchIdentifier: this.switchIdentifier });
      return;
    }
  }
}