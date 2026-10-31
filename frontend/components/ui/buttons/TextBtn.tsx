import BaseBtn, { type BtnProps } from "./BaseBtn";

// Botón de texto: solo la etiqueta en primary, con la misma área de toque de 48 dp.
export default function TextBtn(props: BtnProps) {
    return <BaseBtn variant="text" {...props} />;
}
