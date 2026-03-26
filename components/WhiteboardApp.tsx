import React from 'react';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

const WhiteboardApp: React.FC = () => {
    return (
        <div className="h-full w-full overflow-hidden rounded-2xl bg-white">
            <Tldraw persistenceKey="zenith-utility-whiteboard" />
        </div>
    );
};

export default WhiteboardApp;
