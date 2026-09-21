import { queryClient } from "../../App";
import { useMutation } from "@tanstack/react-query"

export interface Registrar {
    displayName: string;
    email: string;
    passwordHash: string;
}

export interface RegistroFieldErrors {
    field: "displayName" | "email" | "passwordHash" | "confirmPassword";
    message: string;
}

export const URL = "http://localhost:3000/auth"

export const useRegistrar  = () => {
    return useMutation({
        mutationFn: async(registrar: Registrar) => {
            const response = await fetch(`http://192.168.1.81:3000/user`, {
                method: "POST",
                headers: {
                    "Content-type": "application/json",
                },
                body: JSON.stringify(registrar),
            })

            const payload = await response.json().catch(() => null)

            if (!response.ok) {
                throw payload ?? { message: "Error al registrar" };
            }

            return payload
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["postRegister"]})
        }
    })
}