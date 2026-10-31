import BaseBtn, { type BtnProps } from "./BaseBtn";

// Botón secundario: borde y texto en primary, sin relleno.
export default function BgBtn(props: BtnProps) {
    return <BaseBtn variant="secondary" {...props} />;
}
