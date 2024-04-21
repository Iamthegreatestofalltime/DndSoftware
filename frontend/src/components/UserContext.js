import React, { createContext, useState } from 'react';

export const UserContext = createContext();

export function UserProvider(props) {
    const [username, setUsername] = useState(null);
    const [id, setId] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);

    return (
        <UserContext.Provider value={{ username, setUsername, id, setId, token, setToken }}>
            {props.children}
        </UserContext.Provider>
    );
}