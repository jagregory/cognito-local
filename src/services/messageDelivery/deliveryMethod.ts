import { VerifiedAttributesListType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import { attributeValue, User } from "../userPoolService";
import { DeliveryDetails } from "./messageDelivery";

export const selectAppropriateDeliveryMethod = (
  desiredDeliveryMediums: VerifiedAttributesListType,
  user: User
): DeliveryDetails | null => {
  if (desiredDeliveryMediums.includes("phone_number")) {
    const phoneNumber = attributeValue("phone_number", user.Attributes);
    if (phoneNumber) {
      return {
        AttributeName: "phone_number",
        DeliveryMedium: "SMS",
        Destination: phoneNumber,
      };
    }
  }

  if (desiredDeliveryMediums.includes("email")) {
    const email = attributeValue("email", user.Attributes);
    if (email) {
      return {
        AttributeName: "email",
        DeliveryMedium: "EMAIL",
        Destination: email,
      };
    }
  }

  return null;
};
