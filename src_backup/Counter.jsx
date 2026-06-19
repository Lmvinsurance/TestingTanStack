import React, { useState } from 'react'

function App() {
  const [counter,setCounter] = useState(0);

  const incrementHandler = ()=>{
        setCounter(prev=> prev + 1);
  }
  const decrementHandler = ()=>{
         setCounter(prev => prev -1);
  }
  return (
    <div>
      <h1>COUNTER : {counter}</h1>
      <button onClick={incrementHandler}>INCREMENT</button>
       <button onClick={decrementHandler} disabled={counter === 0}>DECREMENT</button>
    </div>
  )
}

export default App