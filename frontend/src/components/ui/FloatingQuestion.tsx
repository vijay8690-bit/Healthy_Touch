import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { contactService } from '@/services/query.service';
import { useToast } from '@/hooks/use-toast';

const FloatingQuestion: React.FC = () => {
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // show popup after a short delay on page load. Do NOT persist dismissals across reloads.
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  const closePopup = () => {
    // hide popup until page reload
    setVisible(false);
    setModalOpen(false);
    setDismissed(true);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || !question.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide your email and question',
        variant: 'destructive',
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await contactService.submitQuestion({ email, message: question });
      
      if (response.success) {
        setSubmitted(true);
        toast({
          title: 'Question Submitted!',
          description: 'We will respond to your email soon.',
        });
        
        setTimeout(() => {
          setSubmitted(false);
          setEmail('');
          setQuestion('');
          setModalOpen(false);
          closePopup();
        }, 1500);
      }
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.response?.data?.message || 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (dismissed) return null;

  return (
    <>
      {visible && !modalOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          className="fixed bottom-6 left-6 z-50 max-w-xs sm:left-8"
        >
          <div className="relative rounded-2xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-lg p-6 w-72">
            <button
              aria-label="Close"
              onClick={closePopup}
              className="absolute -top-2 -right-2 bg-background rounded-full p-1 shadow-md hover:scale-105 transition-transform"
            >
              <X className="w-4 h-4 text-primary" />
            </button>

            <div className="flex flex-col items-center gap-3 text-center">
              <p className="font-display font-semibold text-lg">Have a question?</p>
              <p className="text-sm text-primary-foreground/90">Feel free to ask here!</p>
              <Button
                onClick={() => setModalOpen(true)}
                className="w-full bg-background text-primary hover:bg-background/90"
              >
                Ask Now
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.24 }}
            className="relative w-full max-w-lg bg-background rounded-2xl shadow-xl p-6 z-10"
          >
            <button
              aria-label="Close"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display text-lg font-semibold mb-2">Ask a question</h3>
            <p className="text-sm text-muted-foreground mb-4">Our team will respond to your email soon.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full"
                  required
                />
              </div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your question..."
                className="w-full min-h-[120px] resize-none rounded-md border bg-input px-3 py-2 text-sm outline-none"
                required
              />

              <div className="flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  className="text-sm text-muted-foreground hover:text-foreground" 
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <Button type="submit" disabled={!email.trim() || !question.trim() || submitting}>
                  {submitting ? 'Sending...' : submitted ? 'Sent!' : 'Send Question'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default FloatingQuestion;
