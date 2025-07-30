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

export abstract class SwitchAccessory {

  public switchService: Service;

  protected storage: StorageLayer;

  public switchState: SwitchState = {
    isOn: false,
  };

  public readonly switchIdentifier: string;

  constructor(
    protected readonly platform: SmartOccupancyHomebridgePlatform,
    protected readonly occupancySensorAccessory: OccupancySensorAccessory,
    protected readonly switchConfig: SwitchConfig,
    protected readonly sensorConfig: OccupancySensorConfig,
    protected readonly persistPath: string,
    protected readonly log: Logging,
  ) {

    this.storage = new StorageLayer(this.persistPath);

    this.switchIdentifier = `${switchConfig.name}-${switchConfig.type}`;

    this.switchService = this.occupancySensorAccessory.occupancySensorAccessory.getService(this.switchIdentifier)
      ?? this.occupancySensorAccessory.occupancySensorAccessory.addService(this.platform.Service.Switch, switchConfig.name, this.switchIdentifier);

    this.switchService.setCharacteristic(this.platform.Characteristic.ConfiguredName, switchConfig.name);

    this.switchService.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));

    this.initStatus().catch((error) => {
      this.log.error(`Failed to initialize switch status for ${switchConfig.name}:`, error);
    });

  }

  protected async initStatus() {
    if (this.sensorConfig.persistStatusAcrossReboots) {
      await this.storage.init();
      const persistedState = await this.storage.getItem<SwitchState>(this.switchIdentifier);
      if (!persistedState) {
        this.log.warn(`No persisted state found for switch ${this.switchConfig.name}, initializing to OFF`);
        this.setStatus(false);
        return;
      }
      this.log.info(`Switch ${this.switchConfig.name} initialized with persisted state:`, persistedState);
      this.setStatus(persistedState.isOn);
      return;
    }
    if (this.sensorConfig.alwaysBootAsOccupied) {
      this.log.info(`Switch ${this.switchConfig.name} initialized as ON`);
      this.setStatus(true);
      return;
    }
  }

  handleOnGet(): CharacteristicValue {
    this.log.debug('Triggered GET On');
    return this.getStatusCharacteristic();
  }

  handleOnSet(value: CharacteristicValue) {
    this.log.debug('Triggered SET On:', value);
    this.setStatus(Boolean(value), { updateCharacteristic: false, triggerSwitchActions: true });
  }

  protected getStatusCharacteristic(): number {
    return Number(this.switchState.isOn);
  }

  public setStatus(value: boolean, options: SetSwitchStatusOptions = { updateCharacteristic: true, triggerSwitchActions: true }) {
    this.log.debug('Setting switch status to:', value);
    this.switchState.isOn = value;
    if (this.sensorConfig.persistStatusAcrossReboots) {
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
      this.log.debug(`Occupancy is already ON, no action for switch ${this.switchConfig.type} turned ON event.`);
      return false;
    }
    if (!this.occupancySensorAccessory.occupancySensorState.occupied && !this.switchState.isOn) {
      this.log.debug(`Occupancy is already OFF, no action for switch ${this.switchConfig.type} turned OFF event.`);
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
