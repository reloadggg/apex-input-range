import { createContext, useContext } from 'react';
import { controllerLabels } from './gamepad';
import type { ControllerLayout } from './gamepad';

export const ControllerLayoutContext = createContext<ControllerLayout>('xbox');
export function useControllerLabels() { return controllerLabels(useContext(ControllerLayoutContext)); }
