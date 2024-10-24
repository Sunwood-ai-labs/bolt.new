// app/components/sidebar/Menu.client.tsx
import { motion, type Variants } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, ChangeEvent } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { IconButton } from '~/components/ui/IconButton';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { db, deleteById, getAll, chatId, type ChatHistoryItem } from '~/lib/persistence';
import { cubicEasingFn } from '~/utils/easings';
import { logger } from '~/utils/logger';
import { HistoryItem } from './HistoryItem';
import { binDates } from './date-binning';
import { MODEL_LIST } from '~/utils/constants';


const menuVariants = {
  closed: {
    opacity: 0,
    visibility: 'hidden',
    left: '-150px',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    opacity: 1,
    visibility: 'initial',
    left: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

type DialogContent = { type: 'delete'; item: ChatHistoryItem } | null;

interface APIKeys {
  [key: string]: string | null;
}


// Function to get unique provider names (including 'Bedrock')
const getUniqueProviders = () => {
  const providers = new Set<string>();
  MODEL_LIST.forEach(model => providers.add(model.provider));
  return Array.from(providers);
};

export function Menu() {
  const menuRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<ChatHistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);
  const [apiKeys, setAPIKeys] = useState<APIKeys>({});
  const [awsCredentials, setAwsCredentials] = useState({
    accessKeyId: "",
    secretAccessKey: "",
    region: "",
  });

  const loadEntries = useCallback(() => {
    if (db) {
      getAll(db)
        .then((list) => list.filter((item) => item.urlId && item.description))
        .then(setList)
        .catch((error) => toast.error(error.message));
    }
  }, []);

  const deleteItem = useCallback((event: React.UIEvent, item: ChatHistoryItem) => {
    event.preventDefault();

    if (db) {
      deleteById(db, item.id)
        .then(() => {
          loadEntries();

          if (chatId.get() === item.id) {
            window.location.pathname = '/';
          }
        })
        .catch((error) => {
          toast.error('Failed to delete conversation');
          logger.error(error);
        });
    }
  }, []);

  const closeDialog = () => {
    setDialogContent(null);
  };

  useEffect(() => {
    if (open) {
      loadEntries();
    }
  }, [open]);

  useEffect(() => {
    const enterThreshold = 40;
    const exitThreshold = 40;

    function onMouseMove(event: MouseEvent) {
      if (event.pageX < enterThreshold) {
        setOpen(true);
      }

      if (menuRef.current && event.clientX > menuRef.current.getBoundingClientRect().right + exitThreshold) {
        setOpen(false);
      }
    }

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  // Load API keys and AWS credentials from localStorage on component mount (DEV ONLY - INSECURE)
  useEffect(() => {
    getUniqueProviders().forEach(provider => {
        try {
                const storedKey = localStorage.getItem(`${provider}_API_KEY`);
                setAPIKeys(prevKeys => ({ ...prevKeys, [provider]: storedKey }));

              if (provider === 'Bedrock') {
                 setAwsCredentials({
                  accessKeyId: localStorage.getItem(`AWS_ACCESS_KEY_ID`) || "",
                  secretAccessKey: localStorage.getItem(`AWS_SECRET_ACCESS_KEY`) || "",
                   region: localStorage.getItem(`AWS_REGION`) || "",
              });
           }

        } catch (error) {
             console.error(`Error loading credentials for ${provider}:`, error);
            toast.error(`Error loading credentials for ${provider}`);
         }
      });


  }, []);


  const handleApiKeyChange = (provider: string, event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setAPIKeys({
      ...apiKeys,
      [provider]: value,
    });

    // Store API keys in localStorage (INSECURE - consider alternatives for production!)
    if (typeof window !== "undefined") {
      localStorage.setItem(`${provider}_API_KEY`, value);
    }

  };

  const handleAWSCredentialsChange = (
    field: keyof typeof awsCredentials,
    value: string
  ) => {
    setAwsCredentials({
      ...awsCredentials,
      [field]: value,
    });

    // Store in localStorage (INSECURE - reconsider for production)
    if (typeof window !== "undefined") {
      localStorage.setItem(`AWS_${field.toUpperCase()}`, value);
    }
  };

  const saveAWSCredentials = () => {
    // Here you could perform validation if needed

    // For this example, we'll just display a success message
    toast.success("AWS Credentials Saved (insecurely)");
  };


// Helper function to retrieve API keys, handling undefined/null
const getStoredAPIKey = (provider: string) => {
  return apiKeys[provider] || null; 
};



  return (
    <motion.div
      ref={menuRef}
      initial="closed"
      animate={open ? 'open' : 'closed'}
      variants={menuVariants}
      className="flex flex-col side-menu fixed top-0 w-[350px] h-full bg-bolt-elements-background-depth-2 border-r rounded-r-3xl border-bolt-elements-borderColor z-sidebar shadow-xl shadow-bolt-elements-sidebar-dropdownShadow text-sm"
    >
      <div className="flex items-center h-[var(--header-height)]">{/* Placeholder */}</div>
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        <div className="p-4">
          <a
            href="/"
            className="flex gap-2 items-center bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme"
          >
            <span className="inline-block i-bolt:chat scale-110" />
            Start new chat
          </a>
        </div>
        <div className="text-bolt-elements-textPrimary font-medium pl-6 pr-5 my-2">Your Chats</div>
      {/* API Key and AWS Credentials Input Section */}
      <div className="pl-6 pr-5 mb-4">
          <div className="text-bolt-elements-textPrimary font-medium mb-2">API Keys (WARNING: Client-side storage is insecure)</div>
          {/* Render input fields for each provider EXCEPT Ollama */}
          {getUniqueProviders().map(provider => (
             <div key={provider} className="mb-2">
              <label htmlFor={`${provider}-api-key`} className="block text-bolt-elements-textSecondary mb-1">
                {provider} API Key:
              </label>
              <input
                type="password"
                id={`${provider}-api-key`}
                value={getStoredAPIKey(provider) || ""}
                onChange={(e) => handleApiKeyChange(provider, e)}
                className="w-full p-2 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background text-bolt-elements-textPrimary focus:outline-none"
              />


                {provider === 'Bedrock' && ( 
                  <> {/* AWS Credentials Input inside Bedrock section */}
                    <div className="mt-2">
                       <label htmlFor="aws-access-key-id" className="block text-bolt-elements-textSecondary mb-1">Access Key ID:</label>
                       <input
                         type="password" // Hide the key
                        id="aws-access-key-id"
                         value={awsCredentials.accessKeyId}
                        onChange={(e) => handleAWSCredentialsChange("accessKeyId", e.target.value)}
                        className="w-full p-2 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background text-bolt-elements-textPrimary focus:outline-none"
                       />
                   </div>
                   <div className="mt-2">
                       <label htmlFor="aws-secret-access-key" className="block text-bolt-elements-textSecondary mb-1">Secret Access Key:</label>
                      <input
                         type="password" // Hide the key
                         id="aws-secret-access-key"
                         value={awsCredentials.secretAccessKey}
                        onChange={(e) => handleAWSCredentialsChange("secretAccessKey", e.target.value)}
                         className="w-full p-2 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background text-bolt-elements-textPrimary focus:outline-none"
                       />
                    </div>
                     <div className="mt-2">
                        <label htmlFor="aws-region" className="block text-bolt-elements-textSecondary mb-1">Region:</label>
                        <input
                          type="text"
                          id="aws-region"
                          value={awsCredentials.region}
                          onChange={(e) => handleAWSCredentialsChange("region", e.target.value)}
                          className="w-full p-2 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background text-bolt-elements-textPrimary focus:outline-none"
                         />
                      </div>
                      <button
                         onClick={saveAWSCredentials}
                         className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" // Example button styles
                       >
                        Save AWS Credentials
                       </button>
                  </>
                 )}

              </div>
          ))}
        </div>

      <div className="flex items-center border-t border-bolt-elements-borderColor p-4">
          <ThemeSwitch className="ml-auto" />
        </div>
      </div>
    </motion.div>
  );
}
