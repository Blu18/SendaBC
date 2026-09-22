import { View, Pressable, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, GestureResponderEvent } from "react-native";

interface BtnProps {
    text: string,
    style?: StyleProp<ViewStyle>
    textStyle?: StyleProp<TextStyle>
    onPress?: (event: GestureResponderEvent) => void;
}

export default function BgBtn(props: BtnProps) {

    return(
        <Pressable onPress={props.onPress}  style={({ pressed }) => [styles.btn, props.style, {opacity: pressed ? 0.7 : 1}]}>
            <Text style={[styles.text, props.textStyle]}>{props.text}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    btn: {
      backgroundColor: "#EDEAE1",
      padding: 6,
      borderRadius: 12,
      alignSelf: 'stretch',
      alignItems: 'center',
      borderWidth: 2,
      borderColor:'#38412c'
    },
    text: {
      color: '#38412c',
      fontWeight: 'semibold',
      fontSize: 16
    }
})