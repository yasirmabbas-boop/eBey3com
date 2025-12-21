import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PostRegistrationSurvey } from "./post-registration-survey";

interface UserProfile {
  id: string;
  accountType: string;
  surveyCompleted?: boolean;
  ageBracket?: string;
  interests?: string[];
}

export function SurveyManager() {
  const [showSurvey, setShowSurvey] = useState(false);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/account/profile"],
    retry: false,
  });

  useEffect(() => {
    if (profile && !isLoading) {
      const isBuyer = profile.accountType === "buyer";
      const surveyNotCompleted = !profile.surveyCompleted;
      
      if (isBuyer && surveyNotCompleted) {
        const timer = setTimeout(() => {
          setShowSurvey(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [profile, isLoading]);

  if (!showSurvey) return null;

  return (
    <PostRegistrationSurvey 
      open={showSurvey} 
      onClose={() => setShowSurvey(false)} 
    />
  );
}
