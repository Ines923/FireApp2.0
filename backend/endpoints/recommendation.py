from flask import Flask
from flask_restful import reqparse, abort, Resource, fields, marshal_with, inputs
from gurobi.DataGenerator import NumberGenerator, LoadVolunteers, shiftpopulator
from gurobi.Names import firstNames, lastNames
from gurobi.Scheduler import Schedule
from gurobi.AssetTypes import Request, LightUnit, MediumTanker, HeavyTanker

import random
from ast import literal_eval # casts a string to a dict


# Define data input
# Validate a timeblock input
def input_timeblock(timeblock, name):
    timeblock = inputs.natural(timeblock)
    max_timeblock = 335
    if timeblock > max_timeblock:
        raise ValueError("The parameter '{}' is too large. Max is {}. You gave us: {}".format(name, max_timeblock, timeblock))
    return timeblock

def input_enum(string, enum_values):
    for value in enum_values:
        if string == value:
            return True
    return False

# Validate an asset request input
def input_asset_req(value, name):
    # Validate that asset_list contains dictionaries
    try:
        if type(value) is not dict:
            cast_dict = literal_eval(value)
        else:
            cast_dict = value
    except:
        raise ValueError("The parameter '{}' is not a dictionary. You gave us: {}".format(name, value))
    if type(cast_dict) is dict:
        # Validate asset_id key
        if 'asset_id' in cast_dict:
            cast_dict['asset_id'] = inputs.positive(cast_dict['asset_id'])
        else:
            raise ValueError("The parameter 'asset_id' does not exist in the dictionary: {}".format(value))
        # Validate asset_name key
        if 'asset_name' in cast_dict:
            if type(cast_dict['asset_name']) is not str:
                raise ValueError("The parameter 'asset_name' is not a string. You gave us: {}".format(cast_dict['asset_name']))
            else:
                if not input_enum(cast_dict['asset_name'], ["Heavy Tanker", "Medium Unit", "Light Unit"]):
                    raise ValueError("The parameter 'asset_name' is not a valid asset like {}. You gave us: {}".format("[Heavy Tanker, Medium Unit, Light Unit]", cast_dict['asset_name']))
        else:
            raise ValueError("The parameter 'asset_name' does not exist in the dictionary: {}".format(value))
        # Validate start_time key
        if 'start_time' in cast_dict:
            cast_dict['start_time'] = input_timeblock(cast_dict['start_time'], 'start_time')
        else:
            raise ValueError("The parameter 'start_time' does not exist in the dictionary: {}".format(value))
        # Validate start_time key
        if 'end_time' in cast_dict:
            cast_dict['end_time'] = input_timeblock(cast_dict['end_time'], 'end_time')
        else:
            raise ValueError("The parameter 'end_time' does not exist in the dictionary: {}".format(value))
        # Validate the start_time is before the end_time
        if cast_dict['start_time'] >= cast_dict['end_time']:
            raise ValueError("The start_time '{}' cannot be after the end_time '{}'".format(cast_dict['start_time'], cast_dict['end_time']))

    return cast_dict

parser = reqparse.RequestParser()
parser.add_argument('asset_list', action='append', type=input_asset_req)

# Define data output
TimeBlock = fields.Integer

position_field = {
    'position_id': fields.Integer,
    'role': fields.String, # driver | advanced | basic
    'qualifications': fields.String,
}

volunteer_field = {
    'volunteer_id': fields.Integer,
    'position_id': fields.Integer,
    'volunteer_name': fields.String,
    'role': fields.String, # driver | advanced | basic
    'qualifications': fields.List(fields.String),
    'contact_info': fields.List(fields.Nested({
        'type': fields.String, # email | phone
        'detail': fields.String, # email_add | phone_no
    }))
}

recommendation_list_field = {
    'asset_id': fields.Integer,
    'asset_class': fields.String, # Enum
    # 'start_time': TimeBlock,
    # 'end_time': TimeBlock,
    'position': fields.List(fields.Nested(position_field)),
    'volunteers': fields.List(fields.Nested(volunteer_field)),
}

def availability_field():
    list_times = shiftpopulator()
    dict_times = {}
    for time in list_times:
        dict_times[time] = fields.Boolean
    return dict_times

volunteer_list_field = {
    'id': fields.Integer,
    'name': fields.String,
    'Explvl': fields.String,
    'prefHours': fields.Integer,
    'phonenumber':fields.Integer,
    'Availability':fields.Nested(availability_field()),
}

resource_fields = {
    'recommendation_list': fields.List(fields.Nested(recommendation_list_field)),
    'volunteer_list': fields.List(fields.Nested(volunteer_list_field)),
}


# Format the position data
def formatPosition(position, role, qualifications):
    return {
        'position_id': position,
        'role': role,
        'qualifications': qualifications,
    }


# Handle the Recommendation endpoint
class Recommendation(Resource):
    def __init__(self, **kwargs):
        # smart_engine is a black box dependency
        self.volunteer_list = kwargs['volunteer_list']

    @marshal_with(resource_fields)
    def post(self):
        args = parser.parse_args()
        # if args["asset_list"] is None:
        #     return
        print(args)

        asset_requests = []
        for asset_request in args["asset_list"]:
            asset_id = asset_request["asset_id"]
            asset_name = asset_request["asset_name"]
            start_time = asset_request["start_time"]
            end_time = asset_request["end_time"]
            # Select the asset
            if asset_name == "Heavy Tanker":
                asset_type = HeavyTanker
            elif asset_name == "Medium Unit":
                asset_type = MediumTanker
            elif asset_name == "Light Unit":
                asset_type = LightUnit
            asset_requests.append(Request(asset_id,asset_type, start_time, end_time))

        try:
            recommendation_list, volunteer_list_out = Schedule(self.volunteer_list, asset_requests)
            print("succeeded to optimise")
            # print(str(volunteer_list_out[0].qualifications))

            return {
                "recommendation_list" : recommendation_list,
                "volunteer_list" : volunteer_list_out
            }
        except:
            print("Failed to optimise")