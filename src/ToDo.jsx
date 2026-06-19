import React, { useState } from 'react'

function App() {
  const [todoValue, setTodoValue] = useState('');
  const [toDo, setTodo] = useState([]);
  const [current, setCurrent] = useState(null);
  const submitHandler = (e) => {
    e.preventDefault();

    if (!todoValue.trim()) return;

    if (current !== null) {
      const updatedTodo = [...toDo];
      updatedTodo[current] = todoValue;
      setTodo(updatedTodo);
    } else {
      setTodo([...toDo, todoValue]);
    }

    setTodoValue('');
    setCurrent(null);
  };
  const editHandler = (itemIndex) => {
    setTodoValue(toDo[itemIndex]);
    setCurrent(itemIndex);
  }
  const deleteHandler = (itemIndex) => {
    const toDoValues = [...toDo];
    const deleteValues = toDo.filter((_, index) => index !== itemIndex);
    setTodo(deleteValues)
    console.log(deleteValues, "updated")
  }
  return (
    <div>TODO APP
      <form onSubmit={submitHandler}>
        <input type='text' value={todoValue} onChange={(e) => setTodoValue(e.target.value)} placeholder='Add Item' />
        <button>{current !== null ? "EDIT" : "SUBMIT"}</button>
      </form>
      {toDo.map((value, item) => (
        <li key={item}>
          {value} <button onClick={() => deleteHandler(item)}>DELETE</button>
          <button onClick={() => editHandler(item)}>EDIT</button>
        </li>
      ))

      }

    </div>
  )
}

export default App