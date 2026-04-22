import React, { useState } from "react";
import { auth } from "../config/firebase.js";
import { createUserWithEmailAndPassword } from "firebase/auth";

const Auth = () => {
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();

  const signIn = () => {};

  return (
    <div>
      <input
        placeholder="Email..."
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="Password..."
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={signIn}>Sign in</button>
    </div>
  );
};

export default Auth;
