import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, Share, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import ContactForm from "../../components/safety/ContactForm";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import BgBtn from "../../components/ui/buttons/BgBtn";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Notice from "../../components/ui/Notice";
import Icon from "../../components/ui/Icon";
import TextBtn from "../../components/ui/buttons/TextBtn";
import { useContactMutations, useEmergencyContacts } from "../../hooks/safety/useEmergencyContacts";
import { erroresDeCampo, mensajeDeFallo, type RouteActionFailure } from "../../lib/routes/status";
import {
    accionesDe,
    CONTACT_MESSAGES,
    CONTACT_STATUS_LABELS,
    puedeAgregar,
    validarContacto,
    type ContactStatus,
    type EmergencyContact,
} from "../../lib/safety/contacts";
import {
    AVISO_911,
    CONTACTS_PAGE_MESSAGES as M,
    textoInvitacion,
    textoPruebaFallida,
    textoQuitar,
} from "../../lib/safety/messages";
import { fontFamilies, type ColorTokens, type Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";

// "Seguridad": los contactos de emergencia de la cuenta (spec 008, CA-1 a CA-7). Es la pestaña
// Seguridad y también se abre encima de la grabación con "Configurar contactos" (spec 009, plan);
// ahí lleva volver. La lista se vuelve a pedir al regresar, para ver los que aceptaron.
export default function EmergencyContactsPage() {
    const navigation = useNavigation();
    const encima = useRoute().name === 'EmergencyContacts';
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);
    const { contacts, offline, status, retry } = useEmergencyContacts();
    const { create, rename, remove, test } = useContactMutations();

    const [agregando, setAgregando] = useState(false);
    const [nuevo, setNuevo] = useState('');
    const [nuevoError, setNuevoError] = useState<string>();
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [editado, setEditado] = useState('');
    const [editadoError, setEditadoError] = useState<string>();
    // Resultado del último mensaje de prueba de cada contacto (CA-6).
    const [pruebas, setPruebas] = useState<Record<string, string>>({});

    const compartir = (contacto: EmergencyContact) => {
        if (!contacto.inviteUrl) return;
        Share.share({ message: textoInvitacion(contacto.inviteUrl) }).catch((e) =>
            console.log('Error al compartir la invitación:', e)
        );
    };

    // Un 400 va junto al campo (CA-2); lo demás, en un aviso.
    const manejarFallo = (titulo: string, fallo: RouteActionFailure, setCampo: (e: string) => void) => {
        const campo = erroresDeCampo(fallo).name;
        if (campo) setCampo(campo);
        else Alert.alert(titulo, mensajeDeFallo(fallo));
    };

    const agregar = () => {
        const errores = validarContacto(nuevo);
        setNuevoError(errores.name);
        if (errores.name) return;
        create.mutate(nuevo.trim(), {
            onSuccess: (contacto) => {
                setAgregando(false);
                setNuevo('');
                // CA-1: al agregarlo, la app da el enlace para compartírselo.
                Alert.alert(M.agregadoTitulo, M.agregadoCuerpo, [
                    { text: 'Ahora no', style: 'cancel' },
                    { text: M.compartir, onPress: () => compartir(contacto) },
                ]);
            },
            onError: (fallo) => manejarFallo('No se pudo agregar', fallo, setNuevoError),
        });
    };

    const empezarEdicion = (contacto: EmergencyContact) => {
        setEditandoId(contacto.id);
        setEditado(contacto.name);
        setEditadoError(undefined);
    };

    const guardarEdicion = (id: string) => {
        const errores = validarContacto(editado);
        setEditadoError(errores.name);
        if (errores.name) return;
        rename.mutate(
            { id, name: editado.trim() },
            {
                onSuccess: () => setEditandoId(null),
                onError: (fallo) => manejarFallo('No se pudo guardar', fallo, setEditadoError),
            }
        );
    };

    const quitar = (contacto: EmergencyContact) => {
        Alert.alert(M.quitarTitulo, textoQuitar(contacto.name), [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: M.quitar,
                style: 'destructive',
                onPress: () =>
                    remove.mutate(contacto.id, {
                        onError: (fallo) => Alert.alert('No se pudo quitar', mensajeDeFallo(fallo)),
                    }),
            },
        ]);
    };

    const probar = (contacto: EmergencyContact) => {
        test.mutate(contacto.id, {
            onSuccess: (r) =>
                setPruebas((p) => ({
                    ...p,
                    [contacto.id]: r.status === 'SENT' ? M.pruebaEnviada : textoPruebaFallida(r.error),
                })),
            // 409 (ya no está activo) y 429 (prueba seguida) traen su motivo del servidor.
            onError: (fallo) => setPruebas((p) => ({ ...p, [contacto.id]: mensajeDeFallo(fallo) })),
        });
    };

    return (
        <View style={styles.screen}>
            <ScreenHeader title={M.titulo} onBack={encima ? () => navigation.goBack() : undefined} />
            {/* "handled": con el teclado abierto, tocar "Agregar" o "Guardar" funciona a la primera. */}
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={styles.explanation}>{M.explicacion}</Text>
                <Text style={styles.subtitle} accessibilityRole="header">{M.subtitulo}</Text>

                {offline && <Notice type="offline" title="Sin conexión" description={M.sinConexion} />}

                {status === 'loading' && <ActivityIndicator size="large" color={theme.colors.primary} />}
                {status === 'error' && (
                    <>
                        <Notice type="error" title="No se pudo cargar" description={M.error} />
                        <PrimaryButton text="Reintentar" onPress={() => void retry()} />
                    </>
                )}

                {status === 'success' && contacts.length === 0 && (
                    <Notice title="Sin contactos" description={M.vacio} />
                )}

                {status === 'success' &&
                    contacts.map((contacto) => {
                        const acciones = accionesDe(contacto);
                        const editando = editandoId === contacto.id;
                        const estado = ESTADO[contacto.status];
                        return (
                            <View key={contacto.id} style={styles.card}>
                                {editando ? (
                                    <ContactForm
                                        value={editado}
                                        onChange={setEditado}
                                        error={editadoError}
                                        submitText="Guardar"
                                        submitting={rename.isPending}
                                        onSubmit={() => guardarEdicion(contacto.id)}
                                        onCancel={() => setEditandoId(null)}
                                    />
                                ) : (
                                    <>
                                        <View style={styles.cardHeader}>
                                            <View style={styles.avatar}>
                                                <Icon name="account-outline" decorative />
                                            </View>
                                            <View style={styles.cardTexts}>
                                                <Text style={styles.name} numberOfLines={2}>{contacto.name}</Text>
                                                {/* Punto y texto: el estado no depende solo del color */}
                                                <View style={styles.status}>
                                                    <View style={[styles.dot, { backgroundColor: theme.colors[estado] }]} />
                                                    <Text style={[styles.statusText, { color: theme.colors[estado] }]}>
                                                        {CONTACT_STATUS_LABELS[contacto.status]}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        {contacto.status === 'ACTIVE' && contacto.telegramName && (
                                            <Text style={styles.muted}>En Telegram: {contacto.telegramName}</Text>
                                        )}
                                        {contacto.status === 'PENDING' && <Text style={styles.muted}>{M.pendiente}</Text>}
                                        {contacto.status === 'UNREACHABLE' && (
                                            <Text style={styles.muted}>{M.inalcanzable}</Text>
                                        )}

                                        {acciones.compartir && (
                                            <PrimaryButton text={M.compartir} onPress={() => compartir(contacto)} />
                                        )}
                                        {acciones.probar && (
                                            <BgBtn
                                                text={test.isPending && test.variables === contacto.id ? 'Enviando…' : M.probar}
                                                disabled={offline || test.isPending}
                                                onPress={() => probar(contacto)}
                                            />
                                        )}
                                        {!!pruebas[contacto.id] && <Text style={styles.result}>{pruebas[contacto.id]}</Text>}

                                        {!offline && (
                                            <View style={styles.row}>
                                                <TextBtn text={M.editar} style={styles.textBtn} onPress={() => empezarEdicion(contacto)} />
                                                <TextBtn text={M.quitar} style={styles.textBtn} onPress={() => quitar(contacto)} />
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        );
                    })}

                {status === 'success' && !offline && (
                    agregando ? (
                        <ContactForm
                            value={nuevo}
                            onChange={setNuevo}
                            error={nuevoError}
                            submitText={M.agregar}
                            submitting={create.isPending}
                            onSubmit={agregar}
                            onCancel={() => {
                                setAgregando(false);
                                setNuevo('');
                                setNuevoError(undefined);
                            }}
                        />
                    ) : puedeAgregar(contacts) ? (
                        <BgBtn text={M.agregar} onPress={() => setAgregando(true)} />
                    ) : (
                        <Text style={styles.muted}>{CONTACT_MESSAGES.limite}</Text>
                    )
                )}

                <Text style={styles.disclaimer}>{AVISO_911}</Text>
            </ScrollView>
        </View>
    );
}

// Activo en primary, pendiente en ocre de texto (RN-4) y "No recibe mensajes" en error, como en
// Figma.
const ESTADO: Record<ContactStatus, keyof ColorTokens> = {
    ACTIVE: 'primary',
    PENDING: 'secondaryText',
    UNREACHABLE: 'error',
};

const makeStyles = (t: Theme) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    content: {
        gap: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
    explanation: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    subtitle: {
        ...t.typography.title,
        color: t.colors.text,
    },
    card: {
        gap: t.spacing.md,
        padding: t.spacing.lg,
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.surface,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: t.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.background,
    },
    cardTexts: {
        flex: 1,
        gap: 2,
    },
    name: {
        ...t.typography.title,
        color: t.colors.text,
    },
    status: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.xs,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: t.radius.pill,
    },
    statusText: {
        ...t.typography.bodySmall,
        fontFamily: fontFamilies.semibold,
    },
    muted: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    result: {
        ...t.typography.bodySmall,
        color: t.colors.data,
    },
    row: {
        flexDirection: 'row',
        gap: t.spacing.sm,
    },
    // Los botones de texto ocupan su etiqueta, alineados a la izquierda como en Figma.
    textBtn: {
        alignSelf: 'flex-start',
    },
    disclaimer: {
        ...t.typography.caption,
        color: t.colors.textMuted,
        textAlign: 'center',
    },
});
