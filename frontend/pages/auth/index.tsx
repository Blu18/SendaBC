import { View, StyleSheet, Text } from 'react-native'
import BgBtn from '../../components/ui/buttons/BgBtn'
import TextBtn from '../../components/ui/buttons/TextBtn'
import { useNavigation } from '@react-navigation/native'

export default function Index() {
    const navigation = useNavigation()

    return(
        <View style={styles.container}>
            <View style={{flex: 1, justifyContent: 'center'}}>
                <Text style={styles.title}>SendaBC</Text>
            </View>
            <View style={styles.btnContainer}>
                <BgBtn 
                  text='Iniciar sesión' 
                  textStyle={{fontSize: 24}} 
                  onPress={() => navigation.navigate('Login')}
                />
                <TextBtn 
                  text='Registrarse' 
                  textStyle={{fontSize: 20, color: "#EDEAE1", textDecorationLine: 'underline'}} 
                  onPress={() => navigation.navigate('Register')}
                />
            </View>
        </View>

    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#5C6B49',
        alignSelf: 'stretch'
    },
    title: {
        color: '#EDEAE1',
        fontWeight: 'bold',
        fontSize: 42
    },
    btnContainer: {
        padding: 32,
        gap: 8,
        alignSelf: 'stretch'
    }
})