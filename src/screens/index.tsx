import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const SignInScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Sign In Screen</Text>
    </View>
  );
};

export const SignUpScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Sign Up Screen</Text>
    </View>
  );
};

export const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Home Screen</Text>
    </View>
  );
};

export const ProfileScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Profile Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});