import { Dimensions } from 'react-native';

export const SCREEN = Dimensions.get('window');
console.log(`[layout] SCREEN dimensions: ${SCREEN.width}x${SCREEN.height}`);
export const HEADER_HEIGHT = 110;
export const BOTTOM_CHROME_HEIGHT = 180;
export const PLAYER_AREA_HEIGHT = SCREEN.height - HEADER_HEIGHT - BOTTOM_CHROME_HEIGHT;
console.log(`[layout] PLAYER_AREA_HEIGHT: ${PLAYER_AREA_HEIGHT}`);
