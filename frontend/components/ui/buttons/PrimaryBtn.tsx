import { View, Pressable, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, GestureResponderEvent } from "react-native";

interface BtnProps {
    text: string,
    style?: StyleProp<ViewStyle>
    textStyle?: StyleProp<TextStyle>
    onPress?: (event: GestureResponderEvent) => void;
    disabled?: boolean;
}

export default function PrimaryButton(props: BtnProps) {

    return(
        <Pressable onPress={props.onPress} disabled={props.disabled} style={({ pressed }) => [styles.btn, props.style, {opacity: props.disabled ? 0.5 : pressed ? 0.7 : 1}]}>
            <Text style={[styles.text, props.textStyle]}>{props.text}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    btn: {
      backgroundColor: "#5C6B49",
      padding: 6,
      borderRadius: 12,
      alignSelf: 'stretch',
      alignItems: 'center',
    },
    text: {
      color: "#EDEAE1",
      fontWeight: 'semibold',
      fontSize: 16
    }
})