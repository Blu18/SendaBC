import { queryClient } from "../../App";
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api/client";
import { useAuth } from "../../context/AuthContext";

export interface Registrar {
    displayName: string;
    email: string;
    passwordHash: string;
}

export interface Login {
    email: string;
    password: string;
}

export interface RegistroFieldErrors {
    field: "displayName" | "email" | "passwordHash" | "confirmPassword";
    message: string;
}

export interface LoginFieldErrors {
    field: "email" | "password";
    message: string;
}

export const useRegistrar  = () => {
    return useMutation({
        mutationFn: async(registrar: Registrar) => {
            const response = await apiFetch("/user", null, {
                method: "POST",
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

export const useLogin  = () => {
    return useMutation({
        mutationFn: async(login: Login) => {
            const response = await apiFetch("/auth/login", null, {
                method: "POST",
                body: JSON.stringify(login),
            })

            const payload = await response.json().catch(() => null)

            if (!response.ok) {
                throw payload ?? { message: "Error al iniciar sesión" };
            }

            return payload
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["postLogin"]})
        }
    })
}

export const useProfile = () => {
    const { token } = useAuth();

    return useQuery({
        queryKey: ["profile", token],
        enabled: !!token,
        queryFn: async () => {
            const response = await apiFetch("/user/profile", token)

            const payload = await response.json().catch(() => null)

            if (!response.ok) {
                throw payload ?? { message: "Error al cargar el perfil" };
            }

            return payload
        },
    })
}