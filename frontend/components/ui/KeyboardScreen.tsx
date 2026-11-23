import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, StatusBar, type StyleProp, type ViewStyle } from "react-native";

type Props = {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
};

// Pantalla con formulario: al abrir el teclado, el contenido se encoge para que los botones de
// abajo queden a la vista, arriba del teclado (spec 002, CA-10; spec 009). Con la app de borde a
// borde, Android ya no redimensiona la ventana por su cuenta, así que lo hace esta vista con el
// alto del teclado.
//
// En Android, KeyboardAvoidingView mide la pantalla desde debajo de la barra de estado (el
// SafeAreaView de App.tsx ya la descuenta) y el teclado desde el borde de arriba del teléfono: le
// faltaba el alto de esa barra y los botones quedaban medio tapados. Medido en el emulador: teclado
// de 312 dp, barra de unos 50 dp (casos límite, 2026-11-22). Las áreas seguras llegan en 0 dentro de
// la navegación, así que se usa StatusBar.currentHeight.
export default function KeyboardScreen({ children, style }: Props) {
    return (
        <KeyboardAvoidingView
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0}
            style={style}
        >
            {children}
        </KeyboardAvoidingView>
    );
}
