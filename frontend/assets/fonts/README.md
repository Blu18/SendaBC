# Fuentes

Atkinson Hyperlegible Next 2.001 (Regular, SemiBold y Bold), spec 009 plan D3.

- Copyright 2020-2024 The Atkinson Hyperlegible Next Project Authors (https://github.com/googlefonts/atkinson-hyperlegible-next).
- Licencia: SIL Open Font License 1.1 (https://openfontlicense.org). La licencia también va dentro de cada archivo, en su tabla de nombres.
- Origen: paquete npm `@expo-google-fonts/atkinson-hyperlegible-next@0.4.1`. Cada archivo se renombró con su nombre PostScript, para que `fontFamily` sea el mismo en Android (nombre del archivo) y en iOS (nombre de la fuente).
- Las tres traen la función OpenType `tnum` (cifras de ancho fijo), que usa el estilo `metric` (riesgo R3).

Las incrusta el plugin `expo-font` de `app.json`. Si cambias un archivo, compila un development build nuevo.
