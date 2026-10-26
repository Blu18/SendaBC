import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, Share, ActivityIndicator } from "react-native";
import ContactForm from "../../components/safety/ContactForm";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
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
import { colors } from "../../lib/theme/colors";

// "Seguridad": los contactos de emergencia de la cuenta (spec 008, CA-1 a CA-7). Se entra desde
// la pantalla principal. La lista se vuelve a pedir al regresar, para ver los que aceptaron.
export default function EmergencyContactsPage() {
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
        // "handled": con el teclado abierto, tocar "Agregar" o "Guardar" funciona a la primera.
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={styles.title}>{M.titulo}</Text>
            <Text style={styles.subtitle}>{M.subtitulo}</Text>
            <Text style={styles.text}>{M.explicacion}</Text>

            {offline && <Text style={styles.notice}>{M.sinConexion}</Text>}

            {status === 'loading' && <ActivityIndicator size="large" color={colors.primary} />}
            {status === 'error' && (
                <View style={styles.block}>
                    <Text style={styles.text}>{M.error}</Text>
                    <PrimaryButton text="Reintentar" style={styles.button} onPress={() => void retry()} />
                </View>
            )}

            {status === 'success' && contacts.length === 0 && <Text style={styles.text}>{M.vacio}</Text>}

            {status === 'success' &&
                contacts.map((contacto) => {
                    const acciones = accionesDe(contacto);
                    const editando = editandoId === contacto.id;
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
                                        <Text style={styles.name} numberOfLines={2}>{contacto.name}</Text>
                                        <View style={[styles.badge, { backgroundColor: BADGE[contacto.status] }]}>
                                            <Text style={styles.badgeText}>{CONTACT_STATUS_LABELS[contacto.status]}</Text>
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
                                        <PrimaryButton text={M.compartir} style={styles.button} onPress={() => compartir(contacto)} />
                                    )}
                                    {acciones.probar && (
                                        <PrimaryButton
                                            text={test.isPending && test.variables === contacto.id ? 'Enviando…' : M.probar}
                                            disabled={offline || test.isPending}
                                            style={styles.button}
                                            onPress={() => probar(contacto)}
                                        />
                                    )}
                                    {!!pruebas[contacto.id] && <Text style={styles.result}>{pruebas[contacto.id]}</Text>}

                                    {!offline && (
                                        <View style={styles.row}>
                                            <TextBtn text={M.editar} onPress={() => empezarEdicion(contacto)} />
                                            <TextBtn
                                                text={M.quitar}
                                                textStyle={styles.remove}
                                                onPress={() => quitar(contacto)}
                                            />
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    );
                })}

            {status === 'success' && !offline && (
                agregando ? (
                    <View style={styles.card}>
                        <ContactForm
                            value={nuevo}
                            onChange={setNuevo}
                            error={nuevoError}
                            submitText="Agregar"
                            submitting={create.isPending}
                            onSubmit={agregar}
                            onCancel={() => {
                                setAgregando(false);
                                setNuevo('');
                                setNuevoError(undefined);
                            }}
                        />
                    </View>
                ) : puedeAgregar(contacts) ? (
                    <PrimaryButton text={M.agregar} style={styles.button} onPress={() => setAgregando(true)} />
                ) : (
                    <Text style={styles.muted}>{CONTACT_MESSAGES.limite}</Text>
                )
            )}

            <Text style={styles.disclaimer}>{AVISO_911}</Text>
        </ScrollView>
    );
}

// Activo en el primario, pendiente en ocre y "No recibe mensajes" apagado.
const BADGE: Record<ContactStatus, string> = {
    ACTIVE: colors.primary,
    PENDING: colors.secondary,
    UNREACHABLE: colors.textMuted,
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        padding: 16,
        paddingTop: 24,
        gap: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    text: {
        fontSize: 15,
        color: colors.text,
    },
    notice: {
        fontSize: 14,
        color: colors.text,
        borderWidth: 1.5,
        borderColor: colors.secondary,
        padding: 10,
        borderRadius: 8,
    },
    block: {
        gap: 12,
    },
    card: {
        gap: 8,
        padding: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    name: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.background,
    },
    muted: {
        fontSize: 14,
        color: colors.textMuted,
    },
    result: {
        fontSize: 14,
        color: colors.data,
    },
    button: {
        paddingVertical: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    remove: {
        color: colors.error,
    },
    disclaimer: {
        marginTop: 8,
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
    },
});
