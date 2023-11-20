import { useState } from 'react';
import './App.css';
import CameraInput from './components/CameraInput';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FormProvider, useForm } from 'react-hook-form';

const schema = yup.object({
  profile: yup.mixed(),
});

const App = () => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const methods = useForm({
    mode: 'onTouched',
    resolver: yupResolver(schema),
  });
  return (
    <div className="App">
      <FormProvider {...methods}>
        <div className='container'>
          <div>
            <CameraInput 
              name="profile"
              opened={isCameraOpen}
              close={() => setIsCameraOpen(false)}
            />
          </div>
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className='btn btn-primary btn-center'
          >
            Capture Profile 
          </button>
        </div>
      </FormProvider>
    </div>
  );
}

export default App;
