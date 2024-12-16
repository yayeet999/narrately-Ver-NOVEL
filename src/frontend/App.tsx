import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import CreateNovel from './pages/CreateNovel';

const App: React.FC = () => {
 return (
   <Router>
     <Routes>
       <Route path="/create-novel" element={<CreateNovel />} />
     </Routes>
   </Router>
 );
};

export default App; 