import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";
import { PRODUCT_CONDITIONS } from "@/constants/enums";

interface ConditionBadgeProps {
  condition: string;
  className?: string;
  variant?: "default" | "glass";
  children?: ReactNode;
}

const getConditionVariant = (condition: string) => {
  const normalizedCondition = condition?.toLowerCase()?.trim();

  switch (normalizedCondition) {
    case PRODUCT_CONDITIONS.NEW:
      return "conditionNew";
    case PRODUCT_CONDITIONS.LIKE_NEW:
      return "conditionLikeNew";
    case PRODUCT_CONDITIONS.GOOD:
      return "conditionGood";
    case PRODUCT_CONDITIONS.FAIR:
      return "conditionFair";
    case PRODUCT_CONDITIONS.POOR:
      return "conditionPoor";
    default:
      return "secondary";
  }
};

const getConditionDisplayText = (condition: string) => {
  const normalizedCondition = condition?.toLowerCase()?.trim();

  switch (normalizedCondition) {
    case PRODUCT_CONDITIONS.NEW:
      return "New";
    case PRODUCT_CONDITIONS.LIKE_NEW:
      return "Like New";
    case PRODUCT_CONDITIONS.GOOD:
      return "Good";
    case PRODUCT_CONDITIONS.FAIR:
      return "Fair";
    case PRODUCT_CONDITIONS.POOR:
      return "Poor";
    default:
      return condition;
  }
};

const ConditionBadge = ({
  condition,
  className = "",
  variant = "default",
  children,
}: ConditionBadgeProps) => {
  const badgeVariant = getConditionVariant(condition);
  const displayText = getConditionDisplayText(condition);

  if (variant === "glass") {
    return (
      <Badge
        variant={badgeVariant}
        className={`glass-button border-0 rounded-xl capitalize ${className}`}
      >
        {displayText}
        {children}
      </Badge>
    );
  }

  return (
    <Badge
      variant={badgeVariant}
      className={`rounded-xl capitalize ${className}`}
    >
      {displayText}
      {children}
    </Badge>
  );
};

export default ConditionBadge;
