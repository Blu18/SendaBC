import { useEffect } from 'react'
import { View, StyleSheet, Text } from 'react-native'
import PrimaryButton from '../../components/ui/buttons/PrimaryBtn'
import BgBtn from '../../components/ui/buttons/BgBtn'
import Logo from '../../components/brand/Logo'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../../context/AuthContext'
import type { Theme } from '../../lib/theme'
import { useThemedStyles } from '../../hooks/theme/useTheme'

export default function Index() {
    const navigation = useNavigation()
    const { token } = useAuth()
    const styles = useThemedStyles(makeStyles)

    useEffect(() => {
        if (token) {
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
        }
    }, [token])

    if (token) return null

    return(
        <View style={styles.container}>
            <View style={styles.content}>
                {/* El logo empaquetado se ve sin conexión (spec 009, CA-14) */}
                <Logo style={styles.logo} />
                <Text style={styles.description}>
                    Registra tus recorridos de senderismo, trail running y ciclismo en Baja California, aunque no tengas señal.
                </Text>
            </View>
            <View style={styles.actions}>
                <PrimaryButton text='Iniciar sesión' onPress={() => navigation.navigate('Login')} />
                <BgBtn text='Crear cuenta' onPress={() => navigation.navigate('Register')} />
            </View>
        </View>
    )
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.spacing.lg,
        padding: t.spacing.lg,
    },
    // Mismo tamaño que el logo de la bienvenida en Figma
    logo: {
        width: 292,
        height: 70,
    },
    description: {
        ...t.typography.body,
        color: t.colors.textMuted,
        textAlign: 'center',
    },
    actions: {
        gap: t.spacing.sm,
        padding: t.spacing.lg,
    },
})
