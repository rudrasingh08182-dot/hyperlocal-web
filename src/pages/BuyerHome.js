import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BuyerHome() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/buyer'); }, [navigate]);
  return null;
}