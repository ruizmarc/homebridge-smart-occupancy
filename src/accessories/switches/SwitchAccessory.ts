import type { CharacteristicValue, Logging, Service } from 'homebridge';

import type { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { OccupancySensorConfig, SwitchConfig, SwitchType } from '../../types/config.js';
import { OccupancySensorAccessory } from './../OccupancySensorAccessory.js';
import { StorageLayer } from '../../utils/StorageLayer.js';

interface SwitchState {
  isOn: boolean;
}

interface SetSwitchStatusOptions {
  updateCharacteristic?: boolean;
  triggerSwitchActions?: boolean;
}

export abstract class SwitchAccessory<CONFIG extends SwitchConfig = SwitchConfig> {

  public switchService: Service;

  protected readonly MANUAL_STATUS_CHANGE_TIMEOUT = 1000; // 1 second

  public switchState: SwitchState = {
    isOn: false,
  };

  public readonly switchIdentifier: string;

  constructor(
    protected readonly platform: SmartOccupancyHomebridgePlatform,
    protected readonly occupancySensorAccessory: OccupancySensorAccessory,
    protected readonly switchConfig: CONFIG,
    protected readonly sensorConfig: OccupancySensorConfig,
    protected readonly log: Logging,
    protected readonly storage?: StorageLayer,
  ) {

    this.switchIdentifier = `${switchConfig.name}-${switchConfig.type}`;

    this.switchService = this.occupancySensorAccessory.occupancySensorAccessory.getService(this.switchIdentifier)
      ?? this.occupancySensorAccessory.occupancySensorAccessory.addService(this.platform.Service.Switch, switchConfig.name, this.switchIdentifier);

    this.switchService.setCharacteristic(this.platform.Characteristic.ConfiguredName, switchConfig.name);

    this.switchService.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));
  }

  public async initSwitchState() {
    if (!this.sensorConfig.persistStatusAcrossReboots || !this.storage) {
      this.switchService.updateCharacteristic(this.platform.Characteristic.On, this.getStatusCharacteristic());
      this.log.debug(`${this.switchConfig.type}: Switch ${this.switchConfig.name} initialized without persisted state.`);
      return;
    }
    const persistedState = await this.storage.getItem<SwitchState>(this.switchIdentifier);
    if (!persistedState) {
      this.log.warn(`${this.switchConfig.type}: No persisted state found for switch ${this.switchConfig.name}, initializing to OFF`);
      this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false });
      return;
    }
    this.log.info(`${this.switchConfig.type}: Switch ${this.switchConfig.name} initialized with persisted state:`, persistedState);
    if (this.occupancySensorAccessory.occupancySensorState.occupied 
      && this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchType === this.switchConfig.type
      && this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchIdentifier === this.switchIdentifier) {
      if (this.switchConfig.type === SwitchType.TRIGGER_OCCUPANCY_SWITCH || this.switchConfig.type === SwitchType.TRIGGER_STAY_ON_SWITCH) {
        this.setStatus(true, { updateCharacteristic: true, triggerSwitchActions: true });
      } else {
        this.setStatus(persistedState.isOn, { updateCharacteristic: true, triggerSwitchActions: true });
      }
      return;
    }
    this.setStatus(persistedState.isOn, { updateCharacteristic: true, triggerSwitchActions: false });
    return;
  }

  handleOnGet(): CharacteristicValue {
    this.log.debug(`${this.switchConfig.type}: ${this.switchConfig.name} Triggered GET On`);
    return this.getStatusCharacteristic();
  }

  handleOnSet(value: CharacteristicValue) {
    this.log.debug(`${this.switchConfig.type}: ${this.switchConfig.name} Triggered SET On -> `, value);
    this.setStatus(Boolean(value), { updateCharacteristic: false, triggerSwitchActions: true });
  }

  protected getStatusCharacteristic(): number {
    return Number(this.switchState.isOn);
  }

  public setStatus(value: boolean, options: SetSwitchStatusOptions = { updateCharacteristic: true, triggerSwitchActions: true }) {
    this.log.debug(`${this.switchConfig.type}: ${this.switchConfig.name} Setting switch status to -> `, value);
    this.switchState.isOn = value;
    if (this.sensorConfig.persistStatusAcrossReboots && this.storage) {
      this.storage.setItem(this.switchIdentifier, this.switchState).catch((error) => {
        this.log.error(`Failed to persist switch state for ${this.switchConfig.name}:`, error);
      });
    }
    if (options.updateCharacteristic) {
      this.switchService.updateCharacteristic(this.platform.Characteristic.On, this.getStatusCharacteristic());
    }
    if (options.triggerSwitchActions) {
      this.triggerSwitchActions();
    }
  }

  protected abstract triggerSwitchActions(): void;

  protected shouldCancelTimer(): boolean {
    const cancelableTimerSwitchTypes: SwitchType[] = [
      SwitchType.OCCUPANCY_SWITCH,
      SwitchType.TRIGGER_OCCUPANCY_SWITCH,
      SwitchType.STAY_ON_SWITCH,
      SwitchType.TRIGGER_STAY_ON_SWITCH,
      SwitchType.SHUTOFF_SWITCH,
    ];
    return this.occupancySensorAccessory.occupancySensorState.occupied
      && this.switchState.isOn
      && (!!this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchType
        && cancelableTimerSwitchTypes.includes(this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchType!));
  }

  protected occupancyMightChange(): boolean {
    if (this.occupancySensorAccessory.occupancySensorState.occupied && this.switchState.isOn) {
      this.log.debug(`${this.switchConfig.type}: Occupancy is already ON when switch ${this.switchConfig.name} turned ON.`);
      return false;
    }
    if (!this.occupancySensorAccessory.occupancySensorState.occupied && !this.switchState.isOn) {
      this.log.debug(`${this.switchConfig.type}: Occupancy is already OFF when switch ${this.switchConfig.name} turned OFF.`);
      return false;
    }
    return true;
  }

  protected shouldGoOccupied(): boolean {
    return this.switchState.isOn
      && !this.occupancySensorAccessory.occupancySensorState.occupied
      && this.enoughTimeHasPassedSinceLastTrigger();
  }

  protected enoughTimeHasPassedSinceLastTrigger(): boolean {
    if (!this.occupancySensorAccessory.occupancySensorState.lastTriggeredAt) {
      return true;
    }
    const lastTriggeredTime = new Date(this.occupancySensorAccessory.occupancySensorState.lastTriggeredAt).getTime();
    const currentTime = Date.now();
    const timeDifference = currentTime - lastTriggeredTime;
    return timeDifference >= (this.sensorConfig.newOccupancyTimeout ?? 0) * 1000;
  }

  protected otherSwitchesAreBlockingUnoccupyChange(): boolean {
    const blockingUnoccupySwitchTypes: SwitchType[] = [
      SwitchType.STAY_ON_SWITCH,
      SwitchType.OCCUPANCY_SWITCH,
    ];
    const switchAccessories = this.occupancySensorAccessory.switches;

    const blockingSwitchIsTurnedOn = Array.from(switchAccessories.values())
      .some(switchAccessory => switchAccessory.switchState.isOn
        && switchAccessory !== this
        && blockingUnoccupySwitchTypes.includes(switchAccessory.switchConfig.type));

    const prioritySwitchIsBlockingUnoccupy = this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchType === SwitchType.PRESENCE_SWITCH;
    return blockingSwitchIsTurnedOn || prioritySwitchIsBlockingUnoccupy;
  }

}
