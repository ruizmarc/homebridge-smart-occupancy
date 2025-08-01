import { PlatformConfig } from 'homebridge';

export interface OccupancyPlatformConfig extends PlatformConfig {
    name: string;
    sensors: OccupancySensorConfig[];
}

export interface OccupancySensorConfig {
    name: string;
    identifier: string;
    stayOccupiedDelay: number;
    stayOccupiedTimeout: number;
    newOccupancyTimeout: number;
    progressiveDelay: number;
    progressionStart: number;
    progressionStep: number;
    persistStatusAcrossReboots: boolean;
    alwaysBootAsOccupied: boolean;
    switches: (SwitchConfig | NotificationSwitchConfig)[];
}

export interface SwitchConfig {
    name: string;
    type: SwitchType;
    identifier?: string;
}

export interface NotificationSwitchConfig extends SwitchConfig {
    type: SwitchType.NOTIFICATION_SWITCH;
    notificationThreshold: number;
    minimumNotificationTime: number;
}

export enum SwitchType {
    PRESENCE_SWITCH = 'PRESENCE_SWITCH',
    NOTIFICATION_SWITCH = 'NOTIFICATION_SWITCH',
    OCCUPANCY_SWITCH = 'OCCUPANCY_SWITCH',
    TRIGGER_OCCUPANCY_SWITCH = 'TRIGGER_OCCUPANCY_SWITCH',
    STAY_ON_SWITCH = 'STAY_ON_SWITCH',
    TRIGGER_STAY_ON_SWITCH = 'TRIGGER_STAY_ON_SWITCH',
    MASTER_SWITCH = 'MASTER_SWITCH',
    DISABLE_OCCUPANCY_SWITCH = 'DISABLE_OCCUPANCY_SWITCH',
    TRIGGER_SHUTOFF_SWITCH = 'TRIGGER_SHUTOFF_SWITCH',
}