
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ExamSettings, GeneratedExam } from './types';
import { analyzeImagesAndGenerateQuestions } from './services/geminiService';
import Spinner from './components/Spinner';
import ExamPaper from './components/ExamPaper';

const initialSettings: ExamSettings = {
  topic: 'Biology - Cell Structure',
  className: 'Grade 9',
  board: 'CBSE',
  studentName: '',
  language: 'English',
  totalMarks: 50,
  duration: 60,
  mcqCount: 5,
  shortCount: 3,
  longCount: 2,
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<ExamSettings>(initialSettings);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedExam, setGeneratedExam] = useState<GeneratedExam | null>(null);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState<boolean>(false);

  // Ref to hold the dynamically generated HTML string
  const examHtmlRef = useRef<string>('');

  useEffect(() => {
    const checkApiKey = async () => {
      // Check if API key has been selected, particularly for Veo but good practice for all Gemini APIs
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          setShowApiKeyPrompt(true);
        } else {
          setShowApiKeyPrompt(false);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    checkApiKey(); // Only check once on mount
  }, []); // Empty dependency array means this effect runs once after the initial render

  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSettings((prevSettings) => ({
      ...prevSettings,
      [name]: type === 'number' ? parseInt(value, 10) : value,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedImages(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setUploadedImages(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const clearImages = useCallback(() => {
    setUploadedImages([]);
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; // Clear the file input
    }
  }, []);

  const generateExam = useCallback(async () => {
    setError(null);
    setLoading(true);
    setGeneratedExam(null); // Clear previous exam

    if (uploadedImages.length === 0) {
      setError('Please upload at least one image.');
      setLoading(false);
      return;
    }

    try {
      const examContent = await analyzeImagesAndGenerateQuestions(uploadedImages, settings);
      examHtmlRef.current = examContent; // Store the raw content
      setGeneratedExam({ htmlContent: examContent });
    } catch (err: any) {
      console.error('Failed to generate exam:', err);
      if (err.message.includes("API key might be invalid")) {
        setShowApiKeyPrompt(true); // Show prompt if API key issue
      }
      setError(err.message || 'An unexpected error occurred during exam generation.');
    } finally {
      setLoading(false);
    }
  }, [uploadedImages, settings]);

  const handleOpenSelectKey = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // Assume key selection was successful to avoid race condition
      setShowApiKeyPrompt(false);
      // It's a good practice to try re-generating if the key was missing
      // or at least hide the prompt and allow the user to click generate again.
      // For this specific app, we don't auto-retry but allow manual retry.
    }
  }, []);

  const printExam = () => {
    if (generatedExam) {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8 no-print">SmartExam AI</h1>

      {showApiKeyPrompt && (
        <div className="no-print bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 w-full max-w-4xl rounded-md" role="alert">
          <p className="font-bold">API Key Required</p>
          <p>Please select your Google AI Studio API key to use this application.</p>
          <p className="mt-2 text-sm">
            Billing documentation: <a href="ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">ai.google.dev/gemini-api/docs/billing</a>
          </p>
          <button
            onClick={handleOpenSelectKey}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white font-semibold rounded-md hover:bg-yellow-700 transition duration-200"
          >
            Select API Key
          </button>
        </div>
      )}

      <div className="no-print bg-white shadow-lg rounded-lg p-6 sm:p-8 w-full max-w-4xl mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Exam Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="flex flex-col">
            <label htmlFor="topic" className="text-sm font-medium text-gray-700 mb-1">Topic</label>
            <input
              type="text"
              id="topic"
              name="topic"
              value={settings.topic}
              onChange={handleSettingChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="className" className="text-sm font-medium text-gray-700 mb-1">Class</label>
            <input
              type="text"
              id="className"
              name="className"
              value={settings.className}
              onChange={handleSettingChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="board" className="text-sm font-medium text-gray-700 mb-1">Board</label>
            <input
              type="text"
              id="board"
              name="board"
              value={settings.board}
              onChange={handleSettingChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="studentName" className="text-sm font-medium text-gray-700 mb-1">Student Name</label>
            <input
              type="text"
              id="studentName"
              name="studentName"
              value={settings.studentName}
              onChange={handleSettingChange}
              placeholder="Optional"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="language" className="text-sm font-medium text-gray-700 mb-1">Language</label>
            <input
              type="text"
              id="language"
              name="language"
              value={settings.language}
              onChange={handleSettingChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="totalMarks" className="text-sm font-medium text-gray-700 mb-1">Total Marks</label>
            <input
              type="number"
              id="totalMarks"
              name="totalMarks"
              value={settings.totalMarks}
              onChange={handleSettingChange}
              min="1"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="duration" className="text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input
              type="number"
              id="duration"
              name="duration"
              value={settings.duration}
              onChange={handleSettingChange}
              min="1"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="mcqCount" className="text-sm font-medium text-gray-700 mb-1">MCQ Count</label>
            <input
              type="number"
              id="mcqCount"
              name="mcqCount"
              value={settings.mcqCount}
              onChange={handleSettingChange}
              min="0"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="shortCount" className="text-sm font-medium text-gray-700 mb-1">Short Q Count</label>
            <input
              type="number"
              id="shortCount"
              name="shortCount"
              value={settings.shortCount}
              onChange={handleSettingChange}
              min="0"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="longCount" className="text-sm font-medium text-gray-700 mb-1">Long Q Count</label>
            <input
              type="number"
              id="longCount"
              name="longCount"
              value={settings.longCount}
              onChange={handleSettingChange}
              min="0"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="mt-6 border-2 border-dashed border-gray-300 rounded-md p-6 text-center text-gray-500 hover:border-blue-400 transition duration-200 cursor-pointer"
        >
          <p className="mb-2">Drag & drop images here, or click to upload</p>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <label htmlFor="image-upload" className="inline-block bg-blue-500 text-white font-semibold py-2 px-4 rounded-md cursor-pointer hover:bg-blue-600 transition duration-200">
            Select Images
          </label>
          {uploadedImages.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-700 text-sm">{uploadedImages.length} image(s) selected.</p>
              <button
                onClick={clearImages}
                className="mt-2 text-red-500 text-sm hover:text-red-700 underline"
              >
                Clear Images
              </button>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {uploadedImages.map((file, index) => (
                  <div key={index} className="relative w-full aspect-video overflow-hidden rounded-md border border-gray-200">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Uploaded image ${index + 1}`}
                      className="object-cover w-full h-full"
                      onLoad={() => URL.revokeObjectURL(file.name)} // Clean up object URL
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-center space-x-4 sticky bottom-0 bg-white py-4 -mx-6 sm:-mx-8 px-6 sm:px-8 shadow-inner no-print">
          <button
            onClick={generateExam}
            disabled={loading || uploadedImages.length === 0}
            className="flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-md shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Spinner /> : 'Generate Exam Paper'}
          </button>

          {generatedExam && (
            <button
              onClick={printExam}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
            >
              Print Exam
            </button>
          )}
        </div>
      </div>

      {generatedExam && (
        <div className="w-full max-w-4xl mt-8">
          <ExamPaper htmlContent={generatedExam.htmlContent} settings={settings} />
        </div>
      )}
    </div>
  );
};

export default App;
    