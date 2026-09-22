import { View, Pressable, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, GestureResponderEvent } from "react-native";

interface BtnProps {
    text: string,
    style?: StyleProp<ViewStyle>
    textStyle?: StyleProp<TextStyle>
    onPress?: (event: GestureResponderEvent) => void;
}

export default function TextBtn(props: BtnProps) {

    return(
        <Pressable onPress={props.onPress} style={styles.btn}>
            <Text style={[styles.text, props.textStyle]}>{props.text}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    text: {
      color: "#5C6B49", 
      fontWeight: 'semibold', 
      fontSize: 16
    },
    btn: {
      padding: 6,
      borderRadius: 12,
      alignSelf: 'stretch',
      alignItems: 'center',
    },
})