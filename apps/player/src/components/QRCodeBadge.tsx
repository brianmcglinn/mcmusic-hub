import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../lib/colors';

// PLACEHOLDER VALUE — deliberately not real yet. Nothing exists to link
// to: Remote isn't published anywhere (Play Store, a hosted web page,
// etc.), so there's no stable URL a QR code could actually encode right
// now. This renders a real, working QR code so the visual/layout is
// confirmed correct — swap REMOTE_LINK for a real value once there's
// somewhere for it to actually point.
const REMOTE_LINK = 'https://mcmusichub.app';

export function QRCodeBadge({ size = 64 }: { size?: number }) {
  return (
    <View style={[styles.wrap, { padding: size * 0.09 }]}>
      <QRCode value={REMOTE_LINK} size={size} backgroundColor={colors.chrome} color={colors.void} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.chrome,
    borderRadius: 10,
  },
});
