import React, { useState } from 'react'

function App() {
  const [userName,setUserName] =useState("");
  const [email,setEmail] = useState("");
  const [password ,setPassword] = useState("");
  const [phone,setPhone] = useState("");
  const [confirmPassword,setConfirmPassword] =useState("");

  const submitHandler = (e)=>{
      e.preventDefault();
      if(password !== confirmPassword){
        window.alert('password is mismatching!!');
      }
    if (phone.length !== 10) {
  alert("Phone number must be exactly 10 digits.");
  return;
}
       alert("Form submitted successfully!");

  setUserName("");
  setEmail("");
  setPassword("");
  setConfirmPassword("");
     
      
  }
  return (
    <div>LOGIN FORM
      <form onSubmit={submitHandler}>
        <input type='text' required value={userName} onChange={(e)=> setUserName(e.target.value)} placeholder='userName' /><br></br>
        <input type='email' required value={email} onChange={(e)=> setEmail(e.target.value)}  placeholder='email'/><br></br>
        <input type='text'  required value={phone} maxLength={10} placeholder='phone' onChange={(e)=> setPhone(e.target.value.replace(/\D/g,""))} />
        <input type='password' required value={password} onChange={(e)=> setPassword(e.target.value)} placeholder='password'/><br></br>
        <input type='password' required value={confirmPassword} onChange={(e)=> setConfirmPassword(e.target.value)} placeholder='confirm password'/><br></br>
        <button type='submit'>SUBMIT</button>
      </form>
      {
        password
      }
    </div>
  )
}

export default App