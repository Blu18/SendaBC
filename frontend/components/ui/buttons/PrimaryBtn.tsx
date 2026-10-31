import BaseBtn, { type BtnProps } from "./BaseBtn";

// Botón primario. Con variant="danger" es el de peligro, en color error (no alert, RN-5).
export default function PrimaryButton({ variant = "primary", ...props }: BtnProps & { variant?: "primary" | "danger" }) {
    return <BaseBtn variant={variant} {...props} />;
}
