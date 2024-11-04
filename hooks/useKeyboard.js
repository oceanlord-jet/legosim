// src/hooks/useKeyboard.js

import { useEffect, useState } from 'react';

export const useKeyboard = () => {
    const [keys, setKeys] = useState({});

    useEffect(() => {
        const downHandler = ({ key }) => {
            setKeys((prev) => ({ ...prev, [key]: true }));
        };

        const upHandler = ({ key }) => {
            setKeys((prev) => ({ ...prev, [key]: false }));
        };

        window.addEventListener('keydown', downHandler);
        window.addEventListener('keyup', upHandler);

        return () => {
            window.removeEventListener('keydown', downHandler);
            window.removeEventListener('keyup', upHandler);
        };
    }, []);

    return keys;
};
