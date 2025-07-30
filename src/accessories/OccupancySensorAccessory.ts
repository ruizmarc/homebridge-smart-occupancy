import type { CharacteristicValue, Logging, PlatformAccessory, Service } from 'homebridge';
import { Observable, Subject, takeUntil, timer } from 'rxjs';

import type { SmartOccupancyHomebridgePlatform } from '../platform.js';
import { OccupancySensorConfig, SwitchType } from '../types/config.js';
import { SwitchAccessory } from './switches/SwitchAccessory.js';
import { StorageLayer } from '../utils/StorageLayer.js';
import { SwitchFactory } from './switches/SwitchFactory.js';

interface OccupancySensorState {
  occupied: boolean;
  nextDelaySeconds: number;
  triggeredBySwitchIdentifier?: string;
  triggeredBySwitchType?: SwitchType;
  lastTriggeredAt?: string; // ISO date string,
}

export class OccupancySensorAccessory {
  private occupancySensorService!: Service;

  public occupancySensorState: OccupancySensorState;

  private storage: StorageLayer;

  public switches: Map<string, SwitchAccessory> = new Map();

  private log: Logging;

  private timerStartedSubject = new Subject<boolean>();
  public timerStarted$ = this.timerStartedSubject.asObservable();

  private timerFinishedSubject = new Subject<boolean>();
  public timerFinished$ = this.timerFinishedSubject.asObservable();

  private timerCancelledSubject = new Subject<boolean>();
  public timerCancelled$ = this.timerCancelledSubject.asObservable();

  private timerToUnoccupy$?: Observable<0>;

  constructor(
    private readonly platform: SmartOccupancyHomebridgePlatform,
    private readonly occupancySensorConfig: OccupancySensorConfig,
    public readonly occupancySensorAccessory: PlatformAccessory,
    private readonly persistPath: string,
  ) {
    this.storage = new StorageLayer(this.persistPath);
    this.log = platform.log;

    this.occupancySensorState = {
      occupied: false,
      nextDelaySeconds: occupancySensorConfig.progressiveDelay ? occupancySensorConfig.progressionStart : occupancySensorConfig.stayOccupiedDelay,
      lastTriggeredAt: undefined,
      triggeredBySwitchIdentifier: undefined,
      triggeredBySwitchType: undefined,
    };

    this.initAccessoryInformation();
    this.initSwitches();

    this.initSensorStatus().catch((error) => {
      this.log.error(`Failed to initialize occupancy sensor status for ${occupancySensorConfig.name}:`, error);
    });
  }

  private initAccessoryInformation() {
    this.occupancySensorAccessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SmartOccupancy')
      .setCharacteristic(this.platform.Characteristic.Model, 'Occupancy Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'smart-occupancy-sensor');

    this.occupancySensorService = this.occupancySensorAccessory.getService(this.platform.Service.OccupancySensor)
      ?? this.occupancySensorAccessory.addService(this.platform.Service.OccupancySensor);

    this.occupancySensorService.setCharacteristic(this.platform.Characteristic.Name, this.occupancySensorAccessory.displayName);

    this.occupancySensorService.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
      .onSet(this.handleSetOccupancy.bind(this))
      .onGet(this.handleGetOccupancy.bind(this));
  }

  private initSwitches() {
    for (const switchConfig of (this.occupancySensorConfig.switches ?? [])) {
      const switchAccessory = SwitchFactory.createSwitch(
        this.platform,
        this,
        switchConfig,
        this.occupancySensorConfig,
        this.persistPath,
        this.platform.log,
      );
      this.switches.set(switchAccessory.switchIdentifier, switchAccessory);
    }
    const currentSwitchIdentifiers = new Set(Array.from(this.switches.values())
      .map((switchAccessory) => switchAccessory.switchService.UUID + switchAccessory.switchService.subtype));

    const currentRegisteredSwitchServicesMap = new Map<string, Service>();
    const registeredSwitchServices = new Set(
      this.occupancySensorAccessory.services
        .filter((service) => service.subtype?.endsWith('SWITCH'))
        .map(switchService => {
          const switchIdentifier = switchService.UUID + switchService.subtype;
          currentRegisteredSwitchServicesMap.set(switchIdentifier, switchService);
          return switchIdentifier;
        }));

    for (const registeredSwitchService of registeredSwitchServices) {
      if (!currentSwitchIdentifiers.has(registeredSwitchService)) {
        this.log.warn(`Switch service with UUID ${registeredSwitchService} not found in registered services, removing it now.`);
        const serviceToRemove = currentRegisteredSwitchServicesMap.get(registeredSwitchService);
        if (serviceToRemove) {
          this.occupancySensorAccessory.removeService(serviceToRemove);
        }
      }
    }
  }

  private async initSensorStatus() {
    if (this.occupancySensorConfig.persistStatusAcrossReboots) {
      await this.storage.init();
      const persistedState = await this.storage.getItem<OccupancySensorState>(this.occupancySensorAccessory.UUID);
      if (!persistedState) {
        this.log.warn(`No persisted state found for switch ${this.occupancySensorConfig.name}, initializing to OFF`);
        this.setOccupancyStatus(false);
        return;
      }
      this.log.info(`Occupancy sensor ${this.occupancySensorConfig.name} restored state: ${this.occupancySensorState.occupied}`);
      this.setOccupancyStatus(persistedState.occupied);
      return;
    }
    if (this.occupancySensorConfig.alwaysBootAsOccupied) {
      this.log.info(`Occupancy sensor ${this.occupancySensorConfig.name} initialized as ON`);
      this.setOccupancyStatus(true);
      return;
    }
  }

  async handleSetOccupancy(value: CharacteristicValue) {
    this.log.debug('Triggered SET Occupancy:', value);
    this.setOccupancyStatus(Boolean(value), undefined, { updateAccessoryService: false });
  }

  async handleGetOccupancy(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET Occupancy');
    return this.getOccupancyStatusCharacteristicValue();
  }

  private getOccupancyStatusCharacteristicValue(): number {
    if (this.occupancySensorState.occupied) {
      return this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;
    } else {
      return this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
    }
  }

  public setOccupancyStatus(
    occupied: boolean,
    triggeredBy: { switchType: SwitchType; switchIdentifier: string } | null = null,
    options: { updateAccessoryService?: boolean } = { updateAccessoryService: true },
  ) {
    this.log.info('Setting occupancy status to:', occupied);
    if (occupied && !this.occupancySensorState.occupied) {
      this.updateNextDelayToUse();
    }
    this.occupancySensorState.occupied = occupied;
    if (this.occupancySensorState.occupied) {
      this.occupancySensorState.triggeredBySwitchType = triggeredBy?.switchType;
      this.occupancySensorState.triggeredBySwitchIdentifier = triggeredBy?.switchIdentifier;
      this.occupancySensorState.lastTriggeredAt = new Date().toISOString();
    } else {
      this.occupancySensorState.triggeredBySwitchType = undefined;
      this.occupancySensorState.triggeredBySwitchIdentifier = undefined;
    }
    if (this.occupancySensorConfig.persistStatusAcrossReboots) {
      this.storage.setItem(this.occupancySensorAccessory.UUID, this.occupancySensorState).catch((error) => {
        this.log.error(`Failed to persist occupancy sensor state for ${this.occupancySensorConfig.name}:`, error);
      });
    }
    if (options.updateAccessoryService) {
      this.occupancySensorService.updateCharacteristic(this.platform.Characteristic.OccupancyDetected, this.getOccupancyStatusCharacteristicValue());
    }
  }

  public startUnoccupyTimer() {
    this.cancelCurrentUnoccupancyTimer();
    this.log.info(`Starting timer to unoccupy after delay: ${this.occupancySensorState.nextDelaySeconds} seconds`);
    this.timerToUnoccupy$ = timer(this.occupancySensorState.nextDelaySeconds * 1000);
    this.timerToUnoccupy$.pipe(
      takeUntil(this.timerCancelledSubject),
    )
      .subscribe(() => {
        this.timerToUnoccupy$ = undefined;
        this.log.info('Timer finished, setting occupancy to OFF');
        this.setOccupancyStatus(false, undefined, { updateAccessoryService: true });
        this.timerFinishedSubject.next(true);
      });
    this.timerStartedSubject.next(true);
  }

  public cancelCurrentUnoccupancyTimer() {
    if (this.timerToUnoccupy$) {
      this.log.info('Cancelling current unoccupy timer');
      this.timerCancelledSubject.next(true);
      this.timerToUnoccupy$ = undefined;
    } else {
      this.log.debug('No current unoccupy timer to cancel');
    }
  }

  public updateStatusWithNewTriggerInfo(switchIdentifier: string, switchType: SwitchType) {
    this.updateNextDelayToUse();
    this.occupancySensorState.triggeredBySwitchIdentifier = switchIdentifier;
    this.occupancySensorState.triggeredBySwitchType = switchType;
    this.occupancySensorState.lastTriggeredAt = new Date().toISOString();
    if (this.occupancySensorConfig.persistStatusAcrossReboots) {
      this.storage.setItem(this.occupancySensorAccessory.UUID, this.occupancySensorState).catch((error) => {
        this.log.error(`Failed to persist occupancy sensor state for ${this.occupancySensorConfig.name}:`, error);
      });
    }
  }

  public updateNextDelayToUse() {
    if (!this.occupancySensorConfig.progressiveDelay) {
      return;
    }
    const firstActivationInLongTime = !this.timerToUnoccupy$ && !this.isLastActivationInsideProgressiveDelay() && !this.occupancySensorState.occupied;
    if (firstActivationInLongTime) {
      this.occupancySensorState.nextDelaySeconds = this.occupancySensorConfig.progressiveDelay
        ? this.occupancySensorConfig.progressionStart
        : this.occupancySensorConfig.stayOccupiedDelay;
      this.log.debug(`No previous active timer, resetting next delay to ${this.occupancySensorState.nextDelaySeconds} seconds`);
      return;
    }
    if (this.occupancySensorState.nextDelaySeconds >= this.occupancySensorConfig.stayOccupiedDelay) {
      this.log.debug('Next delay has reached the maximum configured delay, not increasing further');
      return;
    }
    this.occupancySensorState.nextDelaySeconds += this.occupancySensorConfig.progressionStep;
    if (this.occupancySensorState.nextDelaySeconds > this.occupancySensorConfig.stayOccupiedDelay) {
      this.occupancySensorState.nextDelaySeconds = this.occupancySensorConfig.stayOccupiedDelay;
    }
    this.log.debug(`Updated next delay to: ${this.occupancySensorState.nextDelaySeconds} seconds`);
  }

  private isLastActivationInsideProgressiveDelay(): boolean {
    if (!this.occupancySensorState.lastTriggeredAt) {
      return false;
    }
    const lastTriggeredTime = new Date(this.occupancySensorState.lastTriggeredAt).getTime();
    const currentTime = Date.now();
    const timeSinceLastTrigger = (currentTime - lastTriggeredTime) / 1000;
    return timeSinceLastTrigger < (this.occupancySensorState.nextDelaySeconds + this.occupancySensorConfig.progressionStep);
  }

}
